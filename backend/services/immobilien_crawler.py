import asyncio
import json
import logging
import os
import random
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from selenium import webdriver
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    NoSuchElementException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait


class ImmobilienCrawler:
    """
    Selenium-basierter Crawler für WBM-Immobilien
    Adaptiert aus dem ursprünglichen Bot-Code für Backend-Integration
    """

    def __init__(self, user_id: int, filter_settings: Dict, user_data: Dict):
        self.user_id = user_id
        self.filter_settings = filter_settings
        self.user_data = user_data
        self.driver = None
        self.logger = logging.getLogger(f"{__name__}.Crawler.{user_id}")

        # WBM-URL
        self.url = "https://www.wbm.de/wohnungen-berlin/angebote/"

        # Bekannte Angebote (sollten später in DB gespeichert werden)
        self.known_listings = set()

    def setup_browser(self):
        """Initialisiert den Browser für das Crawling"""
        self.logger.info(f"Initialisiere Browser für User {self.user_id}...")

        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-notifications")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
        )

        try:
            # Versuche ChromeDriver zu finden
            chromedriver_paths = [
                "/usr/local/bin/chromedriver",
                "/usr/bin/chromedriver",
                "/snap/bin/chromedriver",
            ]

            chromedriver_path = None
            for path in chromedriver_paths:
                if os.path.exists(path):
                    chromedriver_path = path
                    break

            if chromedriver_path:
                service = Service(chromedriver_path)
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
                self.logger.info(
                    f"Browser mit ChromeDriver von {chromedriver_path} initialisiert"
                )
            else:
                self.driver = webdriver.Chrome(options=chrome_options)
                self.logger.info(
                    "Browser mit automatisch erkanntem ChromeDriver initialisiert"
                )

        except WebDriverException as e:
            self.logger.error(f"Fehler bei der Chrome-Initialisierung: {e}")
            raise

    def accept_cookies(self):
        """Cookie-Banner akzeptieren, falls vorhanden"""
        try:
            cookie_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable(
                    (By.CSS_SELECTOR, "button.cookie-accept-all")
                )
            )
            cookie_button.click()
            self.logger.info("Cookie-Banner akzeptiert")
        except TimeoutException:
            self.logger.info("Kein Cookie-Banner gefunden oder bereits akzeptiert")
        except Exception as e:
            self.logger.warning(f"Fehler beim Akzeptieren der Cookies: {e}")

    async def check_for_new_listings(self) -> List[Dict[str, Any]]:
        """Überprüft die WBM-Website auf neue Angebote"""
        self.logger.info(
            f"Überprüfe auf neue Angebote für User {self.user_id}: {self.url}"
        )

        try:
            self.driver.get(self.url)

            # Cookies akzeptieren
            self.accept_cookies()

            # Warten, bis die Angebote geladen sind
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "div.openimmo-search-list-item")
                )
            )

            # Alle Angebote finden
            listings = self.driver.find_elements(
                By.CSS_SELECTOR, "div.openimmo-search-list-item"
            )

            if not listings:
                self.logger.warning(
                    "Keine Angebote gefunden. Möglicherweise hat sich die Webseitenstruktur geändert."
                )
                return []

            self.logger.info(f"Gefunden: {len(listings)} Angebote")

            new_listings = []
            for listing in listings:
                try:
                    # Informationen zum Angebot extrahieren
                    listing_data = await self.extract_listing_data(listing)

                    if listing_data and self.filter_listing(listing_data):
                        if listing_data["id"] not in self.known_listings:
                            new_listings.append(listing_data)
                            self.known_listings.add(listing_data["id"])
                            self.logger.info(
                                f"Neues gefiltertes Angebot gefunden: {listing_data['titel']} ({listing_data['id']})"
                            )

                except Exception as e:
                    self.logger.error(f"Fehler beim Verarbeiten eines Angebots: {e}")

            self.logger.info(f"Neue gefilterte Angebote gefunden: {len(new_listings)}")
            return new_listings

        except TimeoutException:
            self.logger.error(
                "Timeout beim Laden der Seite. Möglicherweise ist die Internetverbindung langsam oder die Seite nicht verfügbar."
            )
            return []
        except Exception as e:
            self.logger.error(f"Fehler beim Überprüfen auf neue Angebote: {e}")
            return []

    async def extract_listing_data(self, listing) -> Optional[Dict[str, Any]]:
        """Extrahiert Daten aus einem Angebots-Element"""
        try:
            # Link zum Exposé finden
            link_element = listing.find_element(
                By.CSS_SELECTOR, "div.btn-holder a[title='Details']"
            )
            listing_url = link_element.get_attribute("href")

            # Unique ID für das Angebot extrahieren
            try:
                listing_id = listing.get_attribute("data-id")
                if not listing_id:
                    listing_id = listing.get_attribute("data-uid")
            except:
                base_id = (
                    listing_url.split("/")[-2]
                    if listing_url.split("/")[-1] == ""
                    else listing_url.split("/")[-1]
                )
                listing_id = f"{base_id}_{int(time.time())}"

            # Titel der Wohnung
            try:
                titel_element = listing.find_element(By.CSS_SELECTOR, "h2.imageTitle")
                titel = titel_element.text
            except NoSuchElementException:
                titel = "Unbekannter Titel"

            # Adresse der Wohnung
            try:
                adresse_element = listing.find_element(By.CSS_SELECTOR, "div.address")
                adresse = adresse_element.text
            except NoSuchElementException:
                adresse = "Unbekannte Adresse"

            # Bezirk (Area) extrahieren
            try:
                area_element = listing.find_element(By.CSS_SELECTOR, "div.area")
                area = area_element.text
            except NoSuchElementException:
                area = "Unbekannter Bezirk"

            # Warmmiete extrahieren
            try:
                warmmiete_element = listing.find_element(
                    By.CSS_SELECTOR, ".main-property-value.main-property-rent"
                )
                warmmiete_text = (
                    warmmiete_element.text.replace("€", "")
                    .replace(".", "")
                    .replace(",", ".")
                    .strip()
                )
                warmmiete = float(warmmiete_text)
            except (NoSuchElementException, ValueError):
                warmmiete = float("inf")

            # Zimmerzahl extrahieren
            try:
                zimmer_element = listing.find_element(
                    By.CSS_SELECTOR, ".main-property-value.main-property-rooms"
                )
                zimmer = int(float(zimmer_element.text.strip()))
            except (NoSuchElementException, ValueError):
                zimmer = 0

            # WBS-Erfordernis prüfen
            has_wbs = False
            if "WBS" in titel or "wbs" in titel.lower():
                has_wbs = True

            try:
                property_list = listing.find_elements(
                    By.CSS_SELECTOR, "ul.check-property-list li"
                )
                for property_item in property_list:
                    if (
                        "WBS" in property_item.text
                        or "wbs" in property_item.text.lower()
                    ):
                        has_wbs = True
                        break
            except NoSuchElementException:
                pass

            return {
                "id": listing_id,
                "url": listing_url,
                "titel": titel,
                "adresse": adresse,
                "area": area,
                "warmmiete": warmmiete,
                "zimmer": zimmer,
                "has_wbs": has_wbs,
            }

        except Exception as e:
            self.logger.error(f"Fehler beim Extrahieren der Angebotsdaten: {e}")
            return None

    def filter_listing(self, listing_data: Dict[str, Any]) -> bool:
        """Filtert ein Angebot basierend auf den User-Filtereinstellungen"""
        # Prüfen, ob der Bezirk ausgeschlossen ist
        if listing_data["area"] in self.filter_settings.get("excluded_areas", []):
            self.logger.debug(
                f"Angebot in ausgeschlossenem Bezirk: {listing_data['area']}"
            )
            return False

        # Prüfen, ob die Warmmiete zu hoch ist
        if listing_data["warmmiete"] > self.filter_settings.get(
            "max_warmmiete", float("inf")
        ):
            self.logger.debug(
                f"Warmmiete zu hoch: {listing_data['warmmiete']} > {self.filter_settings['max_warmmiete']}"
            )
            return False

        # Prüfen, ob zu wenig Zimmer
        if listing_data["zimmer"] < self.filter_settings.get("min_zimmer", 0):
            self.logger.debug(
                f"Zu wenig Zimmer: {listing_data['zimmer']} < {self.filter_settings['min_zimmer']}"
            )
            return False

        # Prüfen, ob WBS-Erfordernis übereinstimmt
        wbs_required = self.filter_settings.get("wbs_required")
        if wbs_required is not None:
            if wbs_required != listing_data["has_wbs"]:
                wbs_status = "mit" if listing_data["has_wbs"] else "ohne"
                filter_status = "mit" if wbs_required else "ohne"
                self.logger.debug(
                    f"WBS-Status passt nicht: {wbs_status} WBS, aber Filter sucht {filter_status} WBS"
                )
                return False

        # Alle Filter bestanden
        return True

    async def fill_contact_form(self, listing: Dict[str, Any]) -> bool:
        """Füllt das Kontaktformular für ein WBM-Angebot aus"""
        listing_url = listing["url"]
        listing_titel = listing.get("titel", "Unbekannter Titel")

        self.logger.info(
            f"Bearbeite Angebot für User {self.user_id}: {listing_titel} ({listing_url})"
        )

        try:
            self.driver.get(listing_url)
            await asyncio.sleep(2)  # Kurze Pause, um die Seite vollständig zu laden

            # Warten, bis das Formular geladen ist
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, "form.powermail_form")
                    )
                )
            except TimeoutException:
                self.logger.warning(
                    f"Kontaktformular nicht gefunden für: {listing_url}"
                )
                return False

            # Formularfelder ausfüllen
            try:
                # Anrede auswählen
                anrede_select = Select(
                    self.driver.find_element(By.ID, "powermail_field_anrede")
                )
                anrede_select.select_by_visible_text(
                    self.user_data.get("anrede", "Herr")
                )

                # Name eingeben
                name_field = self.driver.find_element(By.ID, "powermail_field_name")
                name_field.clear()
                name_field.send_keys(self.user_data.get("name", ""))

                # Vorname eingeben
                vorname_field = self.driver.find_element(
                    By.ID, "powermail_field_vorname"
                )
                vorname_field.clear()
                vorname_field.send_keys(self.user_data.get("vorname", ""))

                # Straße eingeben
                if self.user_data.get("strasse"):
                    strasse_field = self.driver.find_element(
                        By.ID, "powermail_field_strasse"
                    )
                    strasse_field.clear()
                    strasse_field.send_keys(self.user_data["strasse"])

                # PLZ eingeben
                if self.user_data.get("plz"):
                    plz_field = self.driver.find_element(By.ID, "powermail_field_plz")
                    plz_field.clear()
                    plz_field.send_keys(self.user_data["plz"])

                # Ort eingeben
                ort_field = self.driver.find_element(By.ID, "powermail_field_ort")
                ort_field.clear()
                ort_field.send_keys(self.user_data.get("ort", "Berlin"))

                # E-Mail eingeben
                email_field = self.driver.find_element(By.ID, "powermail_field_e_mail")
                email_field.clear()
                email_field.send_keys(self.user_data.get("email", ""))

                # Telefon eingeben
                if self.user_data.get("telefon"):
                    telefon_field = self.driver.find_element(
                        By.ID, "powermail_field_telefon"
                    )
                    telefon_field.clear()
                    telefon_field.send_keys(self.user_data["telefon"])

                # Datenschutzhinweis akzeptieren
                try:
                    datenschutz_checkbox = self.driver.find_element(
                        By.ID, "powermail_field_datenschutzhinweis_1"
                    )
                    if not datenschutz_checkbox.is_selected():
                        self.driver.execute_script(
                            "arguments[0].click();", datenschutz_checkbox
                        )
                except (ElementClickInterceptedException, NoSuchElementException) as e:
                    self.logger.warning(f"Problem mit der Datenschutz-Checkbox: {e}")
                    try:
                        checkbox = self.driver.find_element(
                            By.XPATH,
                            "//input[contains(@id, 'datenschutz') or contains(@id, 'privacy')]",
                        )
                        self.driver.execute_script("arguments[0].click();", checkbox)
                    except Exception as alt_error:
                        self.logger.error(
                            f"Konnte Datenschutz-Checkbox nicht aktivieren: {alt_error}"
                        )
                        return False

                # Formular absenden
                try:
                    submit_button = self.driver.find_element(
                        By.CSS_SELECTOR, "button.btn-primary[type='submit']"
                    )
                    self.driver.execute_script(
                        "arguments[0].scrollIntoView(true);", submit_button
                    )
                    await asyncio.sleep(0.5)
                    submit_button.click()
                except (NoSuchElementException, ElementClickInterceptedException) as e:
                    self.logger.warning(f"Problem mit dem Submit-Button: {e}")
                    try:
                        button = self.driver.find_element(
                            By.XPATH,
                            "//button[@type='submit' or contains(@class, 'submit')]",
                        )
                        self.driver.execute_script("arguments[0].click();", button)
                    except Exception as alt_error:
                        self.logger.error(
                            f"Konnte Submit-Button nicht klicken: {alt_error}"
                        )
                        return False

                # Warten auf Bestätigung
                await asyncio.sleep(5)

                self.logger.info(
                    f"Formular für User {self.user_id} erfolgreich abgesendet: {listing_titel}"
                )
                return True

            except Exception as form_error:
                self.logger.error(
                    f"Fehler beim Ausfüllen des Formulars für User {self.user_id}: {form_error}"
                )
                return False

        except Exception as e:
            self.logger.error(
                f"Allgemeiner Fehler bei der Formularverarbeitung für User {self.user_id}: {e}"
            )
            return False

    def cleanup(self):
        """Räumt Browser-Ressourcen auf"""
        try:
            if self.driver:
                self.driver.quit()
                self.driver = None
            self.logger.info(f"Browser-Cleanup für User {self.user_id} abgeschlossen")
        except Exception as e:
            self.logger.error(
                f"Fehler beim Browser-Cleanup für User {self.user_id}: {e}"
            )
