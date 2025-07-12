import asyncio
import json
import logging
import random
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from database.database import SessionLocal
from models.bewerbung import Bewerbung, BewerbungsStatus
from models.bot_status import BotLog
from models.user import User
from services.immobilien_bot_manager import BotStatus
from services.immobilien_crawler import ImmobilienCrawler
from sqlalchemy.orm import Session


class UserBot:
    """
    Einzelne Bot-Instanz für einen User
    Führt das Crawling und die Bewerbungen für einen spezifischen User durch
    """

    def __init__(self, user: User, bot_manager):
        self.user = user
        self.bot_manager = bot_manager
        self.user_id = user.id
        self.running = False
        self.crawler = None
        self.logger = logging.getLogger(f"{__name__}.UserBot.{self.user_id}")

        # User-spezifische Konfiguration aus Datenbank laden
        self.load_user_config()

        # Bot-Einstellungen
        self.check_interval = 900  # 15 Minuten

    def load_user_config(self):
        """Lädt User-spezifische Konfiguration aus der Datenbank"""
        try:
            # Filter-Einstellungen parsen
            if self.user.filter_einstellungen:
                self.filter_settings = json.loads(self.user.filter_einstellungen)
            else:
                # Standard-Filter wenn keine gesetzt
                self.filter_settings = {
                    "max_warmmiete": 1500,
                    "min_zimmer": 2,
                    "wbs_required": None,
                    "excluded_areas": ["SPANDAU", "Marzahn"],
                }

            # Bewerbungsprofil parsen
            if self.user.bewerbungsprofil:
                self.user_data = json.loads(self.user.bewerbungsprofil)
            else:
                # Standard-Profil aus User-Daten erstellen
                self.user_data = {
                    "anrede": (
                        "Herr" if self.user.vorname else "Frau"
                    ),  # Einfache Heuristik
                    "name": self.user.nachname,
                    "vorname": self.user.vorname,
                    "email": self.user.email,
                    "strasse": "",
                    "plz": "",
                    "ort": "Berlin",
                    "telefon": "",
                }

            self.logger.info(f"User-Konfiguration für {self.user_id} geladen")

        except json.JSONDecodeError as e:
            self.logger.error(f"Fehler beim Parsen der User-Konfiguration: {e}")
            # Fallback zu Standard-Einstellungen
            self.filter_settings = {
                "max_warmmiete": 1500,
                "min_zimmer": 2,
                "wbs_required": None,
                "excluded_areas": [],
            }
            self.user_data = {
                "anrede": "Herr",
                "name": self.user.nachname or "Mustermann",
                "vorname": self.user.vorname or "Max",
                "email": self.user.email,
                "strasse": "",
                "plz": "",
                "ort": "Berlin",
                "telefon": "",
            }

    def setup_crawler(self):
        """Initialisiert den Crawler für diesen User-Bot"""
        self.logger.info(f"Initialisiere Crawler für User {self.user_id}...")

        try:
            self.crawler = ImmobilienCrawler(
                user_id=self.user_id,
                filter_settings=self.filter_settings,
                user_data=self.user_data,
            )
            self.crawler.setup_browser()
            self.logger.info(
                f"Crawler für User {self.user_id} erfolgreich initialisiert"
            )

        except Exception as e:
            self.logger.error(
                f"Fehler bei der Crawler-Initialisierung für User {self.user_id}: {e}"
            )
            raise

    def is_running(self) -> bool:
        """Gibt zurück, ob der Bot aktuell läuft"""
        return self.running

    async def run(self):
        """Hauptschleife des User-Bots"""
        self.running = True
        self.logger.info(f"Bot für User {self.user_id} gestartet")

        try:
            self.setup_crawler()

            self.bot_manager.update_metrics(
                self.user_id,
                status=BotStatus.RUNNING,
                current_action="Bot läuft - Suche nach neuen Angeboten",
            )

            while self.running:
                try:
                    # Status-Update
                    self.bot_manager.update_metrics(
                        self.user_id, current_action="Überprüfe auf neue Angebote..."
                    )

                    new_listings = await self.check_for_new_listings()

                    self.bot_manager.update_metrics(
                        self.user_id,
                        listings_found=self.bot_manager.bot_metrics[
                            self.user_id
                        ].listings_found
                        + len(new_listings),
                    )

                    for listing in new_listings:
                        if not self.running:
                            break

                        self.bot_manager.update_metrics(
                            self.user_id,
                            current_action=f"Bearbeite Angebot: {listing.get('titel', 'Unbekannt')}",
                        )

                        success = await self.process_listing(listing)
                        if success:
                            self.bot_manager.update_metrics(
                                self.user_id,
                                applications_sent=self.bot_manager.bot_metrics[
                                    self.user_id
                                ].applications_sent
                                + 1,
                            )

                        # Pause zwischen Bewerbungen
                        if self.running:
                            pause_time = random.uniform(5, 15)
                            self.bot_manager.update_metrics(
                                self.user_id,
                                current_action=f"Pause für {pause_time:.1f} Sekunden...",
                            )
                            await asyncio.sleep(pause_time)

                    # Pause bis zur nächsten Überprüfung
                    if self.running:
                        next_check = datetime.now().strftime("%H:%M:%S")
                        self.bot_manager.update_metrics(
                            self.user_id,
                            current_action=f"Warte bis zur nächsten Überprüfung um {next_check}",
                        )
                        await asyncio.sleep(self.check_interval)

                except Exception as loop_error:
                    self.logger.error(
                        f"Fehler im Hauptloop für User {self.user_id}: {loop_error}"
                    )
                    self.bot_manager.update_metrics(
                        self.user_id,
                        status=BotStatus.ERROR,
                        error_message=str(loop_error),
                        current_action="Fehler aufgetreten - Neustartversuch in 5 Minuten",
                    )

                    # 5 Minuten warten vor Neustart
                    await asyncio.sleep(300)

                    # Crawler zurücksetzen
                    try:
                        if self.crawler:
                            self.crawler.cleanup()
                        self.setup_crawler()

                        self.bot_manager.update_metrics(
                            self.user_id,
                            status=BotStatus.RUNNING,
                            error_message=None,
                            current_action="Bot nach Fehler neu gestartet",
                        )
                    except Exception as restart_error:
                        self.logger.error(
                            f"Fehler beim Neustart für User {self.user_id}: {restart_error}"
                        )
                        break

        except Exception as e:
            self.logger.error(f"Kritischer Fehler im Bot für User {self.user_id}: {e}")
            self.bot_manager.update_metrics(
                self.user_id,
                status=BotStatus.ERROR,
                error_message=f"Kritischer Fehler: {str(e)}",
                current_action="Bot gestoppt wegen kritischem Fehler",
            )

        finally:
            await self.cleanup()

    async def stop(self):
        """Stoppt den Bot"""
        self.logger.info(f"Stoppe Bot für User {self.user_id}")
        self.running = False
        await self.cleanup()

    async def cleanup(self):
        """Räumt Ressourcen auf"""
        try:
            if self.crawler:
                self.crawler.cleanup()
                self.crawler = None
            self.logger.info(f"Cleanup für User {self.user_id} abgeschlossen")
        except Exception as e:
            self.logger.error(f"Fehler beim Cleanup für User {self.user_id}: {e}")

    async def check_for_new_listings(self) -> List[Dict[str, Any]]:
        """Überprüft auf neue Angebote"""
        if not self.crawler:
            self.logger.error(f"Kein Crawler für User {self.user_id} initialisiert")
            return []

        try:
            return await self.crawler.check_for_new_listings()
        except Exception as e:
            self.logger.error(
                f"Fehler beim Überprüfen neuer Angebote für User {self.user_id}: {e}"
            )
            # Log in Datenbank speichern
            self.log_to_database("ERROR", f"Fehler beim Crawling: {str(e)}", "crawl")
            return []

    async def process_listing(self, listing: Dict[str, Any]) -> bool:
        """Verarbeitet ein neues Angebot"""
        try:
            # Zunächst Bewerbung in Datenbank als PENDING speichern
            db = SessionLocal()

            bewerbung = Bewerbung(
                user_id=self.user_id,
                wohnungsname=listing.get("titel", "Unbekannt"),
                adresse=listing.get("adresse", "Unbekannt"),
                preis=listing.get("warmmiete"),
                anzahl_zimmer=listing.get("zimmer"),
                status=BewerbungsStatus.PENDING,
            )

            db.add(bewerbung)
            db.commit()
            db.refresh(bewerbung)

            # Log erstellen
            self.log_to_database(
                "INFO",
                f"Neue Bewerbung erstellt: {listing.get('titel')}",
                "apply",
                listing.get("id"),
            )

            # Kontaktformular ausfüllen
            if self.crawler:
                form_success = await self.crawler.fill_contact_form(listing)

                if form_success:
                    bewerbung.status = BewerbungsStatus.SENT
                    self.log_to_database(
                        "INFO",
                        f"Bewerbung erfolgreich versendet: {listing.get('titel')}",
                        "apply",
                        listing.get("id"),
                    )
                else:
                    bewerbung.status = BewerbungsStatus.REJECTED
                    self.log_to_database(
                        "ERROR",
                        f"Fehler beim Versenden der Bewerbung: {listing.get('titel')}",
                        "apply",
                        listing.get("id"),
                    )

                db.commit()
                db.close()

                self.logger.info(
                    f"Bewerbung für User {self.user_id} verarbeitet: {listing.get('titel')} - Status: {bewerbung.status.value}"
                )
                return form_success
            else:
                db.close()
                return False

        except Exception as e:
            self.logger.error(
                f"Fehler beim Verarbeiten der Bewerbung für User {self.user_id}: {e}"
            )
            self.log_to_database(
                "ERROR",
                f"Fehler beim Verarbeiten der Bewerbung: {str(e)}",
                "apply",
                listing.get("id"),
            )
            return False

    def log_to_database(
        self, level: str, message: str, action: str, listing_id: str = None
    ):
        """Speichert einen Log-Eintrag in der Datenbank"""
        try:
            db = SessionLocal()

            log_entry = BotLog(
                user_id=self.user_id,
                level=level,
                message=message,
                action=action,
                listing_id=listing_id,
            )

            db.add(log_entry)
            db.commit()
            db.close()

        except Exception as e:
            self.logger.error(
                f"Fehler beim Speichern des Logs für User {self.user_id}: {e}"
            )
