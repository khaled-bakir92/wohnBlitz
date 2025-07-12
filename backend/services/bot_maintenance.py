import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List

from core.logging_config import bot_metrics, get_logger
from database.database import SessionLocal
from models.bewerbung import Bewerbung
from models.bot_status import BotLog
from services.immobilien_bot_manager import BotStatus, bot_manager
from sqlalchemy import func
from sqlalchemy.orm import Session


class BotMaintenanceService:
    """
    Service für regelmäßige Wartungsaufgaben der Bot-Infrastruktur
    """

    def __init__(self):
        self.logger = get_logger("maintenance")
        self.running = False
        self.maintenance_task = None

    async def start_maintenance(self, interval_minutes: int = 60):
        """Startet regelmäßige Wartungsaufgaben"""
        if self.running:
            self.logger.warning("Wartungsservice läuft bereits")
            return

        self.running = True
        self.maintenance_task = asyncio.create_task(
            self._maintenance_loop(interval_minutes)
        )

        self.logger.info(
            f"Wartungsservice gestartet (Intervall: {interval_minutes} Minuten)"
        )

    async def stop_maintenance(self):
        """Stoppt die Wartungsaufgaben"""
        self.running = False

        if self.maintenance_task:
            self.maintenance_task.cancel()
            try:
                await self.maintenance_task
            except asyncio.CancelledError:
                pass

        self.logger.info("Wartungsservice gestoppt")

    async def _maintenance_loop(self, interval_minutes: int):
        """Hauptschleife für Wartungsaufgaben"""
        while self.running:
            try:
                await self.run_maintenance_tasks()

                # Warten bis zum nächsten Intervall
                await asyncio.sleep(interval_minutes * 60)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Fehler in Wartungsschleife: {e}")
                await asyncio.sleep(60)  # 1 Minute warten bei Fehlern

    async def run_maintenance_tasks(self):
        """Führt alle Wartungsaufgaben aus"""
        self.logger.info("Starte Wartungsaufgaben...")

        # 1. Log-Cleanup
        await self.cleanup_old_logs()

        # 2. Bot-Gesundheitscheck
        await self.health_check_bots()

        # 3. Metriken aktualisieren
        await self.update_metrics()

        # 4. Datenbank-Cleanup
        await self.cleanup_database()

        self.logger.info("Wartungsaufgaben abgeschlossen")

    async def cleanup_old_logs(self, days_to_keep: int = 30):
        """Löscht alte Log-Einträge aus der Datenbank"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)

            db = SessionLocal()

            # Zähle Logs vor dem Löschen
            old_logs_count = (
                db.query(BotLog).filter(BotLog.timestamp < cutoff_date).count()
            )

            # Lösche alte Logs
            deleted_count = (
                db.query(BotLog).filter(BotLog.timestamp < cutoff_date).delete()
            )

            db.commit()
            db.close()

            if deleted_count > 0:
                self.logger.info(
                    f"Log-Cleanup: {deleted_count} alte Log-Einträge gelöscht"
                )
                bot_metrics.increment_counter("logs_cleaned", amount=deleted_count)

        except Exception as e:
            self.logger.error(f"Fehler beim Log-Cleanup: {e}")

    async def health_check_bots(self):
        """Überprüft die Gesundheit aller aktiven Bots"""
        try:
            all_statuses = bot_manager.get_all_bot_statuses()

            for status in all_statuses:
                user_id = status["user_id"]
                bot_status = status["status"]
                last_activity = status.get("last_activity")

                # Prüfe auf inaktive Bots (keine Aktivität in den letzten 2 Stunden)
                if last_activity:
                    last_activity_time = datetime.fromisoformat(last_activity)
                    if datetime.now() - last_activity_time > timedelta(hours=2):

                        if bot_status == "running":
                            self.logger.warning(
                                f"Bot für User {user_id} zeigt keine Aktivität seit {last_activity}",
                                user_id=user_id,
                                last_activity=last_activity,
                            )

                            # Metrik für inaktive Bots
                            bot_metrics.increment_counter("inactive_bots_detected")

                # Prüfe auf Bots im Fehlerzustand
                if bot_status == "error":
                    error_message = status.get("error_message", "Unbekannter Fehler")
                    self.logger.warning(
                        f"Bot für User {user_id} im Fehlerzustand: {error_message}",
                        user_id=user_id,
                        error=error_message,
                    )

                    bot_metrics.increment_counter("bots_in_error_state")

            # Gesundheitscheck-Metrik
            healthy_bots = len([s for s in all_statuses if s["status"] == "running"])
            bot_metrics.set_gauge("healthy_bots_count", healthy_bots)

        except Exception as e:
            self.logger.error(f"Fehler beim Bot-Gesundheitscheck: {e}")

    async def update_metrics(self):
        """Aktualisiert System-Metriken"""
        try:
            db = SessionLocal()

            # Bewerbungsstatistiken der letzten 24 Stunden
            last_24h = datetime.now() - timedelta(hours=24)

            recent_applications = (
                db.query(Bewerbung)
                .filter(Bewerbung.bewerbungsdatum >= last_24h)
                .count()
            )

            successful_applications = (
                db.query(Bewerbung)
                .filter(
                    Bewerbung.bewerbungsdatum >= last_24h,
                    Bewerbung.status.in_(["sent", "responded"]),
                )
                .count()
            )

            # Fehlerrate der letzten 24 Stunden
            error_logs = (
                db.query(BotLog)
                .filter(BotLog.timestamp >= last_24h, BotLog.level == "ERROR")
                .count()
            )

            total_logs = db.query(BotLog).filter(BotLog.timestamp >= last_24h).count()

            db.close()

            # Metriken setzen
            bot_metrics.set_gauge("applications_24h", recent_applications)
            bot_metrics.set_gauge(
                "successful_applications_24h", successful_applications
            )
            bot_metrics.set_gauge("error_logs_24h", error_logs)

            if total_logs > 0:
                error_rate = (error_logs / total_logs) * 100
                bot_metrics.set_gauge("error_rate_24h", error_rate)

            self.logger.info(
                f"Metriken aktualisiert: {recent_applications} Bewerbungen, "
                f"{successful_applications} erfolgreich, {error_logs} Fehler"
            )

        except Exception as e:
            self.logger.error(f"Fehler beim Aktualisieren der Metriken: {e}")

    async def cleanup_database(self):
        """Führt allgemeine Datenbank-Cleanup-Aufgaben durch"""
        try:
            db = SessionLocal()

            # Beispiel: Lösche sehr alte Bewerbungen (älter als 1 Jahr)
            one_year_ago = datetime.now() - timedelta(days=365)

            old_applications = (
                db.query(Bewerbung)
                .filter(Bewerbung.bewerbungsdatum < one_year_ago)
                .count()
            )

            if old_applications > 0:
                self.logger.info(
                    f"Gefunden: {old_applications} alte Bewerbungen (älter als 1 Jahr)"
                )
                # Hier könnte man sie löschen, wenn gewünscht
                # deleted = db.query(Bewerbung).filter(...).delete()

            db.close()

        except Exception as e:
            self.logger.error(f"Fehler beim Datenbank-Cleanup: {e}")

    async def force_restart_bot(self, user_id: int) -> Dict[str, Any]:
        """Erzwingt einen Neustart eines Bots"""
        try:
            self.logger.info(f"Erzwinge Neustart für Bot von User {user_id}")

            # Bot stoppen
            stop_result = await bot_manager.stop_bot(user_id)

            # Kurz warten
            await asyncio.sleep(2)

            # Bot neu starten
            start_result = await bot_manager.start_bot(user_id)

            return {
                "success": True,
                "message": f"Bot für User {user_id} erfolgreich neugestartet",
                "stop_result": stop_result,
                "start_result": start_result,
            }

        except Exception as e:
            self.logger.error(f"Fehler beim Neustart von Bot {user_id}: {e}")
            return {"success": False, "message": f"Fehler beim Neustart: {str(e)}"}

    async def get_maintenance_report(self) -> Dict[str, Any]:
        """Erstellt einen Wartungsbericht"""
        try:
            db = SessionLocal()

            # Bot-Status sammeln
            all_statuses = bot_manager.get_all_bot_statuses()

            # Log-Statistiken
            last_24h = datetime.now() - timedelta(hours=24)

            log_stats = (
                db.query(BotLog.level, func.count(BotLog.id).label("count"))
                .filter(BotLog.timestamp >= last_24h)
                .group_by(BotLog.level)
                .all()
            )

            # Bewerbungsstatistiken
            app_stats = (
                db.query(Bewerbung.status, func.count(Bewerbung.id).label("count"))
                .filter(Bewerbung.bewerbungsdatum >= last_24h)
                .group_by(Bewerbung.status)
                .all()
            )

            db.close()

            return {
                "timestamp": datetime.now().isoformat(),
                "bot_overview": {
                    "total_tracked": len(all_statuses),
                    "status_distribution": {},
                    "bots": all_statuses,
                },
                "log_statistics": {stat.level: stat.count for stat in log_stats},
                "application_statistics": {
                    stat.status.value: stat.count for stat in app_stats
                },
                "system_metrics": bot_metrics.get_metrics(),
            }

        except Exception as e:
            self.logger.error(f"Fehler beim Erstellen des Wartungsberichts: {e}")
            return {"timestamp": datetime.now().isoformat(), "error": str(e)}


# Globale Wartungsservice-Instanz
maintenance_service = BotMaintenanceService()
