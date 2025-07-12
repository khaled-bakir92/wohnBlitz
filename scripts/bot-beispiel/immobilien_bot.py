#!/usr/bin/env python3
import time
import smtplib
import logging
import json
import os
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException, WebDriverException

# Basisverzeichnis
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
LOG_DIR = os.path.join(BASE_DIR, "logs")

# Verzeichnisse erstellen, falls sie nicht existieren
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# Konfiguration für das Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "wbm_bot.log")),
        logging.StreamHandler()
    ]
)

class WBMBot:
    def __init__(self, check_interval=900, headless=True):
        """
        Initialisiert den WBM Immobilien-Bot
        
        :param check_interval: Intervall zwischen den Überprüfungen in Sekunden (Standard: 15 Minuten)
        :param headless: Browser im Headless-Modus (ohne GUI) betreiben (Standard: True)
        """
        self.url = "https://www.wbm.de/wohnungen-berlin/angebote/"
        self.check_interval = check_interval
        self.headless = headless
        self.known_listings = set()
        
        # Persönliche Daten für das Formular - HIER ANPASSEN
        self.user_data = {
            "anrede": "Frau",
            "name": "Khibo",
            "vorname": "Revana",
            "strasse": "Rummelsburger str 35 B",
            "plz": "10315",
            "ort": "Berlin",
            "email": "revana.khibo94@gmail.com",
            "telefon": "01752555047"
        }
        
        # Kontaktdaten für E-Mail-Benachrichtigungen - HIER ANPASSEN
        self.notification_email = {
            "sender": "khaled132112@gmail.com",
            "recipient": "khaled132112@gmail.com",
            "password": "mpfmceerfozdqnyv",  # E-Mail-Passwort oder App-Passwort
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587
        }
        
        # Filter-Einstellungen - HIER ANPASSEN
        self.filter_settings = {
            "max_warmmiete": 1150,           # Maximale Warmmiete in Euro
            "min_zimmer": 2,                 # Minimale Zimmerzahl
            "wbs_required": False,            # None = egal, True = nur mit WBS, False = nur ohne WBS
            "excluded_areas": ["SPANDAU", "Marzahn"]  # Liste mit Bezirken, die nicht interessant sind
        }
        
        # Filter-Einstellungen aus Konfigurationsdatei laden, falls vorhanden
        self.load_filter_settings()
        
        # Laden gespeicherter Angebote, falls vorhanden
        self.load_known_listings()
        
        # Browser initialisieren
        self.setup_browser()
    
    def setup_browser(self):
        """Initialisiert den Browser für den Betrieb"""
        logging.info("Initialisiere Browser...")
        
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless")
        
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-notifications")
        chrome_options.add_argument("--disable-extensions")
        
        # User-Agent setzen, damit die Website uns nicht als Bot erkennt
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36")
        
        # Chrome/Chromium und ChromeDriver-Pfade ermitteln
        try:
            # Versuche ChromeDriver zu finden
            chromedriver_paths = [
                "/usr/local/bin/chromedriver",  # Standard Ubuntu
                "/usr/bin/chromedriver",        # Manche Distributionen
                "/snap/bin/chromedriver",       # Snap-Installation
            ]
            
            chromedriver_path = None
            for path in chromedriver_paths:
                if os.path.exists(path):
                    chromedriver_path = path
                    break
            
            if chromedriver_path:
                service = Service(chromedriver_path)
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
                logging.info(f"Browser mit ChromeDriver von {chromedriver_path} initialisiert")
            else:
                # Fallback: Automatische Erkennung versuchen
                self.driver = webdriver.Chrome(options=chrome_options)
                logging.info("Browser mit automatisch erkanntem ChromeDriver initialisiert")
            
        except WebDriverException as e:
            logging.error(f"Fehler bei der Chrome-Initialisierung: {e}")
            # Versuch mit Firefox, falls Chrome fehlschlägt
            try:
                from selenium.webdriver.firefox.options import Options as FirefoxOptions
                from selenium.webdriver.firefox.service import Service as FirefoxService
                
                firefox_options = FirefoxOptions()
                if self.headless:
                    firefox_options.add_argument("--headless")
                
                firefox_paths = [
                    "/usr/bin/geckodriver",
                    "/usr/local/bin/geckodriver"
                ]
                
                firefox_path = None
                for path in firefox_paths:
                    if os.path.exists(path):
                        firefox_path = path
                        break
                
                if firefox_path:
                    service = FirefoxService(firefox_path)
                    self.driver = webdriver.Firefox(service=service, options=firefox_options)
                    logging.info(f"Fallback: Firefox mit Geckodriver von {firefox_path} initialisiert")
                else:
                    self.driver = webdriver.Firefox(options=firefox_options)
                    logging.info("Fallback: Firefox mit automatisch erkanntem Geckodriver initialisiert")
                
            except Exception as firefox_error:
                logging.critical(f"Kritischer Fehler: Konnte weder Chrome noch Firefox initialisieren: {firefox_error}")
                raise
    
    def load_known_listings(self):
        """Lädt bereits bekannte Angebote aus einer Datei"""
        try:
            filepath = os.path.join(DATA_DIR, 'known_listings.json')
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    self.known_listings = set(json.load(f))
                logging.info(f"Geladen: {len(self.known_listings)} bekannte Angebote")
            else:
                logging.info("Keine gespeicherten Angebote gefunden, beginne mit leerer Liste")
        except Exception as e:
            logging.error(f"Fehler beim Laden bekannter Angebote: {e}")
    
    def save_known_listings(self):
        """Speichert bekannte Angebote in einer Datei"""
        try:
            filepath = os.path.join(DATA_DIR, 'known_listings.json')
            with open(filepath, 'w') as f:
                json.dump(list(self.known_listings), f)
            logging.info(f"{len(self.known_listings)} Angebote gespeichert")
        except Exception as e:
            logging.error(f"Fehler beim Speichern bekannter Angebote: {e}")
    
    def load_filter_settings(self):
        """Lädt Filter-Einstellungen aus einer Konfigurationsdatei"""
        try:
            filepath = os.path.join(DATA_DIR, 'filter_settings.json')
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    saved_settings = json.load(f)
                    # Nur vorhandene Einstellungen übernehmen
                    for key, value in saved_settings.items():
                        if key in self.filter_settings:
                            self.filter_settings[key] = value
                logging.info("Filter-Einstellungen geladen")
            else:
                logging.info("Keine gespeicherten Filter-Einstellungen gefunden, verwende Standardwerte")
                self.save_filter_settings()  # Standardwerte speichern
        except Exception as e:
            logging.error(f"Fehler beim Laden der Filter-Einstellungen: {e}")
    
    def save_filter_settings(self):
        """Speichert Filter-Einstellungen in einer Konfigurationsdatei"""
        try:
            filepath = os.path.join(DATA_DIR, 'filter_settings.json')
            with open(filepath, 'w') as f:
                json.dump(self.filter_settings, f, indent=4)
            logging.info("Filter-Einstellungen gespeichert")
        except Exception as e:
            logging.error(f"Fehler beim Speichern der Filter-Einstellungen: {e}")
    
    def update_filter_settings(self, new_settings):
        """Aktualisiert die Filter-Einstellungen mit neuen Werten"""
        # Nur gültige Einstellungen übernehmen
        for key, value in new_settings.items():
            if key in self.filter_settings:
                self.filter_settings[key] = value
        
        # Einstellungen speichern
        self.save_filter_settings()
        logging.info("Filter-Einstellungen aktualisiert")
    
    def accept_cookies(self):
        """Cookie-Banner akzeptieren, falls vorhanden"""
        try:
            cookie_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button.cookie-accept-all"))
            )
            cookie_button.click()
            logging.info("Cookie-Banner akzeptiert")
        except TimeoutException:
            logging.info("Kein Cookie-Banner gefunden oder bereits akzeptiert")
        except Exception as e:
            logging.warning(f"Fehler beim Akzeptieren der Cookies: {e}")
    
    def check_for_new_listings(self):
        """Überprüft die WBM-Website auf neue Angebote"""
        logging.info(f"Überprüfe auf neue Angebote: {self.url}")
        
        try:
            self.driver.get(self.url)
            
            # Cookies akzeptieren
            self.accept_cookies()
            
            # Warten, bis die Angebote geladen sind
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.openimmo-search-list-item"))
            )
            
            # Screenshot der Seite für Debugging-Zwecke
            self.driver.save_screenshot(os.path.join(DATA_DIR, "listings_page.png"))
            
            # Alle Angebote finden
            listings = self.driver.find_elements(By.CSS_SELECTOR, "div.openimmo-search-list-item")
            
            if not listings:
                logging.warning("Keine Angebote gefunden. Möglicherweise hat sich die Webseitenstruktur geändert.")
                return []
            
            logging.info(f"Gefunden: {len(listings)} Angebote")
            
            new_listings = []
            for listing in listings:
                try:
                    # Informationen zum Angebot extrahieren
                    # Link zum Exposé finden
                    link_element = listing.find_element(By.CSS_SELECTOR, "div.btn-holder a[title='Details']")
                    listing_url = link_element.get_attribute("href")
                    
                    # Unique ID für das Angebot extrahieren
                    # Verwende die data-id aus dem HTML, die einzigartig für jedes Angebot ist
                    try:
                        listing_id = listing.get_attribute("data-id")
                        # Wenn data-id nicht verfügbar ist, verwende data-uid als Fallback
                        if not listing_id:
                            listing_id = listing.get_attribute("data-uid")
                    except:
                        # Als Fallback die URL verwenden, aber mit einem Zeitstempel kombinieren
                        # um sicherzustellen, dass wir keine Duplikate haben
                        base_id = listing_url.split("/")[-2] if listing_url.split("/")[-1] == "" else listing_url.split("/")[-1]
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
                        warmmiete_element = listing.find_element(By.CSS_SELECTOR, ".main-property-value.main-property-rent")
                        warmmiete_text = warmmiete_element.text.replace("€", "").replace(".", "").replace(",", ".").strip()
                        warmmiete = float(warmmiete_text)
                    except (NoSuchElementException, ValueError):
                        warmmiete = float('inf')  # Wenn keine Warmmiete angegeben ist, unendlich setzen
                    
                    # Zimmerzahl extrahieren
                    try:
                        zimmer_element = listing.find_element(By.CSS_SELECTOR, ".main-property-value.main-property-rooms")
                        zimmer = int(float(zimmer_element.text.strip()))
                    except (NoSuchElementException, ValueError):
                        zimmer = 0
                    
                    # WBS-Erfordernis prüfen (in Titel und Eigenschaften)
                    has_wbs = False
                    if "WBS" in titel or "wbs" in titel.lower():
                        has_wbs = True
                    
                    try:
                        property_list = listing.find_elements(By.CSS_SELECTOR, "ul.check-property-list li")
                        for property_item in property_list:
                            if "WBS" in property_item.text or "wbs" in property_item.text.lower():
                                has_wbs = True
                                break
                    except NoSuchElementException:
                        pass
                    
                    # Angebot filtern
                    if self.filter_listing(warmmiete, zimmer, has_wbs, area):
                        if listing_id not in self.known_listings:
                            new_listings.append({
                                "id": listing_id,
                                "url": listing_url,
                                "titel": titel,
                                "adresse": adresse,
                                "area": area,
                                "warmmiete": warmmiete,
                                "zimmer": zimmer,
                                "has_wbs": has_wbs
                            })
                            self.known_listings.add(listing_id)
                            logging.info(f"Neues gefiltertes Angebot gefunden: {titel} in {adresse} ({listing_id})")
                    else:
                        # Angebot zum Ausschließen merken, auch wenn es bereits gefiltert wurde
                        if listing_id not in self.known_listings:
                            self.known_listings.add(listing_id)
                            logging.info(f"Angebot ausgeschlossen durch Filter: {titel} in {adresse} ({listing_id})")
                            
                except Exception as e:
                    logging.error(f"Fehler beim Verarbeiten eines Angebots: {e}")
            
            self.save_known_listings()
            
            logging.info(f"Neue gefilterte Angebote gefunden: {len(new_listings)}")
            return new_listings
            
        except TimeoutException:
            logging.error("Timeout beim Laden der Seite. Möglicherweise ist die Internetverbindung langsam oder die Seite nicht verfügbar.")
            return []
        except Exception as e:
            logging.error(f"Fehler beim Überprüfen auf neue Angebote: {e}")
            # Browser zurücksetzen bei kritischen Fehlern
            self.reset_browser()
            return []
    
    def filter_listing(self, warmmiete, zimmer, has_wbs, area):
        """
        Filtert ein Angebot basierend auf den Filtereinstellungen
        
        :param warmmiete: Warmmiete des Angebots
        :param zimmer: Anzahl der Zimmer
        :param has_wbs: Ob WBS erforderlich ist
        :param area: Bezirk des Angebots
        :return: True, wenn das Angebot den Filterkriterien entspricht, sonst False
        """
        # Prüfen, ob der Bezirk ausgeschlossen ist
        if area in self.filter_settings["excluded_areas"]:
            logging.debug(f"Angebot in ausgeschlossenem Bezirk: {area}")
            return False
        
        # Prüfen, ob die Warmmiete zu hoch ist
        if warmmiete > self.filter_settings["max_warmmiete"]:
            logging.debug(f"Warmmiete zu hoch: {warmmiete} > {self.filter_settings['max_warmmiete']}")
            return False
        
        # Prüfen, ob zu wenig Zimmer
        if zimmer < self.filter_settings["min_zimmer"]:
            logging.debug(f"Zu wenig Zimmer: {zimmer} < {self.filter_settings['min_zimmer']}")
            return False
        
        # Prüfen, ob WBS-Erfordernis übereinstimmt
        if self.filter_settings["wbs_required"] is not None:
            if self.filter_settings["wbs_required"] != has_wbs:
                wbs_status = "mit" if has_wbs else "ohne"
                filter_status = "mit" if self.filter_settings["wbs_required"] else "ohne"
                logging.debug(f"WBS-Status passt nicht: {wbs_status} WBS, aber Filter sucht {filter_status} WBS")
                return False
        
        # Alle Filter bestanden
        return True
    
    def reset_browser(self):
        """Setzt den Browser zurück bei kritischen Fehlern"""
        logging.info("Setze Browser zurück...")
        try:
            self.driver.quit()
        except:
            pass
        time.sleep(2)
        self.setup_browser()
    
    def fill_contact_form(self, listing):
        """Füllt das Kontaktformular für ein WBM-Angebot aus"""
        listing_url = listing["url"]
        listing_titel = listing.get("titel", "Unbekannter Titel")
        
        logging.info(f"Bearbeite Angebot: {listing_titel} ({listing_url})")
        
        try:
            self.driver.get(listing_url)
            time.sleep(2)  # Kurze Pause, um die Seite vollständig zu laden
            
            # Screenshot für Debugging
            self.driver.save_screenshot(os.path.join(DATA_DIR, f"details_page_{listing['id']}.png"))
            
            # Warten, bis das Formular geladen ist
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "form.powermail_form"))
                )
            except TimeoutException:
                logging.warning(f"Kontaktformular nicht gefunden für: {listing_url}")
                # Screenshot für Debugging
                self.driver.save_screenshot(os.path.join(DATA_DIR, f"form_not_found_{listing['id']}.png"))
                return False
            
            # Formularfelder ausfüllen
            try:
                # Anrede auswählen
                anrede_select = Select(self.driver.find_element(By.ID, "powermail_field_anrede"))
                anrede_select.select_by_visible_text(self.user_data["anrede"])
                
                # Name eingeben
                name_field = self.driver.find_element(By.ID, "powermail_field_name")
                name_field.clear()
                name_field.send_keys(self.user_data["name"])
                
                # Vorname eingeben
                vorname_field = self.driver.find_element(By.ID, "powermail_field_vorname")
                vorname_field.clear()
                vorname_field.send_keys(self.user_data["vorname"])
                
                # Straße eingeben
                strasse_field = self.driver.find_element(By.ID, "powermail_field_strasse")
                strasse_field.clear()
                strasse_field.send_keys(self.user_data["strasse"])
                
                # PLZ eingeben
                plz_field = self.driver.find_element(By.ID, "powermail_field_plz")
                plz_field.clear()
                plz_field.send_keys(self.user_data["plz"])
                
                # Ort eingeben
                ort_field = self.driver.find_element(By.ID, "powermail_field_ort")
                ort_field.clear()
                ort_field.send_keys(self.user_data["ort"])
                
                # E-Mail eingeben
                email_field = self.driver.find_element(By.ID, "powermail_field_e_mail")
                email_field.clear()
                email_field.send_keys(self.user_data["email"])
                
                # Telefon eingeben
                telefon_field = self.driver.find_element(By.ID, "powermail_field_telefon")
                telefon_field.clear()
                telefon_field.send_keys(self.user_data["telefon"])
                
                # Datenschutzhinweis akzeptieren
                try:
                    datenschutz_checkbox = self.driver.find_element(By.ID, "powermail_field_datenschutzhinweis_1")
                    if not datenschutz_checkbox.is_selected():
                        # Manchmal ist ein direkter Klick nicht möglich, daher JavaScript verwenden
                        self.driver.execute_script("arguments[0].click();", datenschutz_checkbox)
                except (ElementClickInterceptedException, NoSuchElementException) as e:
                    # Wenn das normale Klicken nicht funktioniert oder das Element nicht gefunden wird
                    logging.warning(f"Problem mit der Datenschutz-Checkbox: {e}")
                    try:
                        # Alternativ versuchen via XPath
                        checkbox = self.driver.find_element(By.XPATH, "//input[contains(@id, 'datenschutz') or contains(@id, 'privacy')]")
                        self.driver.execute_script("arguments[0].click();", checkbox)
                    except Exception as alt_error:
                        logging.error(f"Konnte Datenschutz-Checkbox nicht aktivieren: {alt_error}")
                        return False
                
                # Screenshot nach dem Ausfüllen für Debugging
                self.driver.save_screenshot(os.path.join(DATA_DIR, f"form_filled_{listing['id']}.png"))
                
                # Formular absenden
                try:
                    submit_button = self.driver.find_element(By.CSS_SELECTOR, "button.btn-primary[type='submit']")
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", submit_button)
                    time.sleep(0.5)  # Kurze Pause vor dem Klicken
                    submit_button.click()
                except (NoSuchElementException, ElementClickInterceptedException) as e:
                    logging.warning(f"Problem mit dem Submit-Button: {e}")
                    try:
                        # Alternativ versuchen via XPath
                        button = self.driver.find_element(By.XPATH, "//button[@type='submit' or contains(@class, 'submit')]")
                        self.driver.execute_script("arguments[0].click();", button)
                    except Exception as alt_error:
                        logging.error(f"Konnte Submit-Button nicht klicken: {alt_error}")
                        return False
                
                # Warten auf Bestätigung oder neue Seite
                time.sleep(5)
                
                # Screenshot nach dem Absenden
                self.driver.save_screenshot(os.path.join(DATA_DIR, f"form_submitted_{listing['id']}.png"))
                
                logging.info(f"Formular für {listing_titel} erfolgreich abgesendet")
                return True
                
            except Exception as form_error:
                logging.error(f"Fehler beim Ausfüllen des Formulars: {form_error}")
                self.driver.save_screenshot(os.path.join(DATA_DIR, f"form_error_{listing['id']}.png"))
                return False
                
        except Exception as e:
            logging.error(f"Allgemeiner Fehler bei der Formularverarbeitung: {e}")
            return False
    
    def send_notification_email(self, new_listings):
        """Sendet eine E-Mail-Benachrichtigung über neue Angebote"""
        if not new_listings:
            return
            
        try:
            # E-Mail-Konfiguration aus den Einstellungen
            sender_email = self.notification_email["sender"]
            receiver_email = self.notification_email["recipient"]
            password = self.notification_email["password"]
            smtp_server = self.notification_email["smtp_server"]
            smtp_port = self.notification_email["smtp_port"]
            
            msg = MIMEMultipart()
            msg["Subject"] = f"Neue WBM-Wohnungsangebote gefunden: {len(new_listings)}"
            msg["From"] = sender_email
            msg["To"] = receiver_email
            
            body = "Folgende neue Wohnungsangebote wurden gefunden und automatisch angefragt:\n\n"
            for i, listing in enumerate(new_listings, 1):
                titel = listing.get("titel", "Unbekannter Titel")
                adresse = listing.get("adresse", "Unbekannte Adresse")
                area = listing.get("area", "Unbekannter Bezirk")
                warmmiete = listing.get("warmmiete", "?")
                zimmer = listing.get("zimmer", "?")
                wbs = "Ja" if listing.get("has_wbs", False) else "Nein"
                
                body += f"{i}. {titel}\n"
                body += f"   Adresse: {adresse}\n"
                body += f"   Bezirk: {area}\n"
                body += f"   Warmmiete: {warmmiete} €\n"
                body += f"   Zimmer: {zimmer}\n"
                body += f"   WBS erforderlich: {wbs}\n"
                body += f"   URL: {listing['url']}\n\n"
            
            body += "\nDiese Nachricht wurde automatisch vom WBM-Bot gesendet."
            
            msg.attach(MIMEText(body, "plain"))
            
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(sender_email, password)
                server.send_message(msg)
                
            logging.info("Benachrichtigungs-E-Mail gesendet")
        except Exception as e:
            logging.error(f"Fehler beim Senden der E-Mail: {e}")
    
    def create_interactive_config(self):
        """Erstellt eine interaktive Konfiguration für Filter-Einstellungen"""
        print("\n=== WBM-Bot Filter-Einstellungen ===\n")
        print("Aktuelle Einstellungen:")
        print(f"1. Maximale Warmmiete: {self.filter_settings['max_warmmiete']} €")
        print(f"2. Minimale Zimmerzahl: {self.filter_settings['min_zimmer']}")
        
        wbs_status = "Egal"
        if self.filter_settings['wbs_required'] is True:
            wbs_status = "Nur mit WBS"
        elif self.filter_settings['wbs_required'] is False:
            wbs_status = "Nur ohne WBS"
        print(f"3. WBS-Filter: {wbs_status}")
        
        excluded_areas = ", ".join(self.filter_settings['excluded_areas']) if self.filter_settings['excluded_areas'] else "Keine"
        print(f"4. Ausgeschlossene Bezirke: {excluded_areas}")
        
        while True:
            print("\nWählen Sie eine Option:")
            print("1 - Maximale Warmmiete ändern")
            print("2 - Minimale Zimmerzahl ändern")
            print("3 - WBS-Filter ändern")
            print("4 - Ausgeschlossene Bezirke verwalten")
            print("5 - Einstellungen speichern und beenden")
            
            try:
                choice = int(input("Ihre Wahl (1-5): "))
                
                if choice == 1:
                    try:
                        new_value = float(input("Neue maximale Warmmiete (€): "))
                        if new_value > 0:
                            self.filter_settings["max_warmmiete"] = new_value
                            print(f"Maximale Warmmiete auf {new_value} € gesetzt")
                        else:
                            print("Ungültiger Wert: Die Warmmiete muss größer als 0 sein")
                    except ValueError:
                        print("Ungültige Eingabe: Bitte geben Sie eine Zahl ein")
                
                elif choice == 2:
                    try:
                        new_value = int(input("Neue minimale Zimmerzahl: "))
                        if new_value > 0:
                            self.filter_settings["min_zimmer"] = new_value
                            print(f"Minimale Zimmerzahl auf {new_value} gesetzt")
                        else:
                            print("Ungültiger Wert: Die Zimmerzahl muss größer als 0 sein")
                    except ValueError:
                        print("Ungültige Eingabe: Bitte geben Sie eine ganze Zahl ein")
                
                elif choice == 3:
                    print("\nWBS-Filter-Optionen:")
                    print("1 - Egal (mit oder ohne WBS)")
                    print("2 - Nur mit WBS")
                    print("3 - Nur ohne WBS")
                    
                    try:
                        wbs_choice = int(input("Ihre Wahl (1-3): "))
                        if wbs_choice == 1:
                            self.filter_settings["wbs_required"] = None
                            print("WBS-Filter auf 'Egal' gesetzt")
                        elif wbs_choice == 2:
                            self.filter_settings["wbs_required"] = True
                            print("WBS-Filter auf 'Nur mit WBS' gesetzt")
                        elif wbs_choice == 3:
                            self.filter_settings["wbs_required"] = False
                            print("WBS-Filter auf 'Nur ohne WBS' gesetzt")
                        else:
                            print("Ungültige Auswahl")
                    except ValueError:
                        print("Ungültige Eingabe: Bitte geben Sie eine Zahl ein")
                
                elif choice == 4:
                    while True:
                        print("\nAusgeschlossene Bezirke verwalten:")
                        print("Aktuelle Liste:", ", ".join(self.filter_settings["excluded_areas"]) if self.filter_settings["excluded_areas"] else "Keine")
                        print("\n1 - Bezirk hinzufügen")
                        print("2 - Bezirk entfernen")
                        print("3 - Liste leeren")
                        print("4 - Zurück zum Hauptmenü")
                        
                        try:
                            area_choice = int(input("Ihre Wahl (1-4): "))
                            
                            if area_choice == 1:
                                new_area = input("Name des auszuschließenden Bezirks: ").strip()
                                if new_area and new_area not in self.filter_settings["excluded_areas"]:
                                    self.filter_settings["excluded_areas"].append(new_area)
                                    print(f"Bezirk '{new_area}' zur Ausschlussliste hinzugefügt")
                                else:
                                    print("Ungültiger Bezirk oder bereits in der Liste")
                            
                            elif area_choice == 2:
                                if not self.filter_settings["excluded_areas"]:
                                    print("Die Liste ist bereits leer")
                                    continue
                                
                                print("Wählen Sie den zu entfernenden Bezirk:")
                                for i, area in enumerate(self.filter_settings["excluded_areas"], 1):
                                    print(f"{i} - {area}")
                                
                                try:
                                    remove_idx = int(input("Nummer des zu entfernenden Bezirks: ")) - 1
                                    if 0 <= remove_idx < len(self.filter_settings["excluded_areas"]):
                                        removed_area = self.filter_settings["excluded_areas"].pop(remove_idx)
                                        print(f"Bezirk '{removed_area}' aus der Ausschlussliste entfernt")
                                    else:
                                        print("Ungültige Auswahl")
                                except ValueError:
                                    print("Ungültige Eingabe: Bitte geben Sie eine Zahl ein")
                            
                            elif area_choice == 3:
                                self.filter_settings["excluded_areas"] = []
                                print("Ausschlussliste geleert")
                            
                            elif area_choice == 4:
                                break
                            
                            else:
                                print("Ungültige Auswahl")
                                
                        except ValueError:
                            print("Ungültige Eingabe: Bitte geben Sie eine Zahl ein")
                
                elif choice == 5:
                    self.save_filter_settings()
                    print("Einstellungen gespeichert")
                    break
                
                else:
                    print("Ungültige Auswahl")
                    
            except ValueError:
                print("Ungültige Eingabe: Bitte geben Sie eine Zahl ein")
    
    def run(self):
        """Hauptfunktion zum Ausführen des Bots"""
        try:
            logging.info("WBM-Bot gestartet")
            
            while True:
                try:
                    new_listings = self.check_for_new_listings()
                    
                    for listing in new_listings:
                        success = self.fill_contact_form(listing)
                        if success:
                            logging.info(f"Anfrage für {listing.get('titel', 'Angebot')} erfolgreich")
                        else:
                            logging.warning(f"Anfrage für {listing.get('titel', 'Angebot')} fehlgeschlagen")
                        
                        # Kurze Pause zwischen den Anfragen, um nicht als Bot erkannt zu werden
                        pause_time = random.uniform(5, 15)
                        logging.info(f"Pause für {pause_time:.1f} Sekunden...")
                        time.sleep(pause_time)
                    
                    if new_listings:
                        self.send_notification_email(new_listings)
                    
                    next_check = time.strftime('%H:%M:%S', time.localtime(time.time() + self.check_interval))
                    logging.info(f"Nächste Überprüfung um {next_check} (in {self.check_interval} Sekunden)")
                    
                    time.sleep(self.check_interval)
                    
                except KeyboardInterrupt:
                    raise
                except Exception as loop_error:
                    logging.error(f"Fehler im Hauptloop: {loop_error}")
                    logging.info("Warte 5 Minuten vor dem nächsten Versuch...")
                    time.sleep(300)
                    self.reset_browser()
                
        except KeyboardInterrupt:
            logging.info("Bot manuell beendet")
        finally:
            try:
                self.driver.quit()
                logging.info("Browser ordnungsgemäß geschlossen")
            except:
                pass


# Hauptprogramm
if __name__ == "__main__":
    import sys
    import argparse
    import random
    
    # Command-Line-Argumente definieren
    parser = argparse.ArgumentParser(description='WBM Wohnungsbot mit Filteroptionen')
    parser.add_argument('--config', action='store_true', help='Nur Konfiguration der Filter starten')
    parser.add_argument('--interval', type=int, default=1800, help='Überprüfungsintervall in Sekunden (Standard: 1800)')
    parser.add_argument('--gui', action='store_true', help='Browser im GUI-Modus starten (nicht headless)')
    
    args = parser.parse_args()
    
    # Bot initialisieren
    bot = WBMBot(check_interval=args.interval, headless=not args.gui)
    
    # Wenn nur Konfiguration gewünscht ist
    if args.config:
        bot.create_interactive_config()
        sys.exit(0)
    
    # Ansonsten Bot normal starten
    # Verhindert, dass der Bot sofort startet (zufällige Verzögerung von 10-30 Sekunden)
    startup_delay = random.randint(10, 30)
    logging.info(f"Starte in {startup_delay} Sekunden...")
    time.sleep(startup_delay)
    
    # Bot starten
    bot.run()
