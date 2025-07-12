import asyncio
import json
import logging
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

from database.database import SessionLocal
from models.bewerbung import Bewerbung, BewerbungsStatus
from models.user import User


class BotStatus(Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    STOPPING = "stopping"


@dataclass
class BotMetrics:
    user_id: int
    status: BotStatus
    listings_found: int = 0
    applications_sent: int = 0
    last_activity: Optional[datetime] = None
    current_action: str = ""
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    runtime_seconds: int = 0


class ImmobilienBotManager:
    """
    Zentraler Manager für alle User-Bot-Instanzen
    Verwaltet den Lebenszyklus und Status aller Bots
    """

    def __init__(self):
        self.user_bots: Dict[int, Any] = {}
        self.bot_metrics: Dict[int, BotMetrics] = {}
        self._lock = threading.Lock()
        self.logger = logging.getLogger(f"{__name__}.BotManager")

    def get_bot_status(self, user_id: int) -> Dict[str, Any]:
        """Gibt den aktuellen Status eines User-Bots zurück"""
        with self._lock:
            if user_id not in self.bot_metrics:
                return {
                    "user_id": user_id,
                    "status": BotStatus.STOPPED.value,
                    "message": "Bot wurde noch nicht gestartet",
                }

            metrics = self.bot_metrics[user_id]
            return {
                "user_id": user_id,
                "status": metrics.status.value,
                "listings_found": metrics.listings_found,
                "applications_sent": metrics.applications_sent,
                "last_activity": (
                    metrics.last_activity.isoformat() if metrics.last_activity else None
                ),
                "current_action": metrics.current_action,
                "error_message": metrics.error_message,
                "started_at": (
                    metrics.started_at.isoformat() if metrics.started_at else None
                ),
                "runtime_seconds": metrics.runtime_seconds,
            }

    async def start_bot(self, user_id: int) -> Dict[str, Any]:
        """Startet einen Bot für einen bestimmten User"""
        with self._lock:
            if user_id in self.user_bots and self.user_bots[user_id].is_running():
                return {
                    "success": False,
                    "message": "Bot läuft bereits für diesen User",
                    "status": self.get_bot_status(user_id),
                }

            # Bot-Metrics initialisieren
            self.bot_metrics[user_id] = BotMetrics(
                user_id=user_id,
                status=BotStatus.STARTING,
                started_at=datetime.now(),
                last_activity=datetime.now(),
                current_action="Bot wird gestartet...",
            )

        try:
            # User-Daten aus Datenbank laden
            db = SessionLocal()
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                with self._lock:
                    self.bot_metrics[user_id].status = BotStatus.ERROR
                    self.bot_metrics[user_id].error_message = "User nicht gefunden"
                return {"success": False, "message": "User nicht gefunden"}

            # UserBot-Instanz erstellen (import here to avoid circular imports)
            from services.user_bot import UserBot

            user_bot = UserBot(user, self)

            with self._lock:
                self.user_bots[user_id] = user_bot
                self.bot_metrics[user_id].status = BotStatus.RUNNING
                self.bot_metrics[user_id].current_action = "Bot erfolgreich gestartet"

            # Bot im Hintergrund starten
            asyncio.create_task(user_bot.run())

            self.logger.info(f"Bot für User {user_id} erfolgreich gestartet")

            return {
                "success": True,
                "message": "Bot erfolgreich gestartet",
                "status": self.get_bot_status(user_id),
            }

        except Exception as e:
            with self._lock:
                self.bot_metrics[user_id].status = BotStatus.ERROR
                self.bot_metrics[user_id].error_message = str(e)

            self.logger.error(f"Fehler beim Starten des Bots für User {user_id}: {e}")
            return {"success": False, "message": f"Fehler beim Starten: {str(e)}"}
        finally:
            db.close()

    async def stop_bot(self, user_id: int) -> Dict[str, Any]:
        """Stoppt einen Bot für einen bestimmten User"""
        with self._lock:
            if user_id not in self.user_bots:
                return {"success": False, "message": "Kein Bot für diesen User aktiv"}

            user_bot = self.user_bots[user_id]
            if user_id in self.bot_metrics:
                self.bot_metrics[user_id].status = BotStatus.STOPPING
                self.bot_metrics[user_id].current_action = "Bot wird gestoppt..."

        try:
            await user_bot.stop()

            with self._lock:
                if user_id in self.user_bots:
                    del self.user_bots[user_id]
                if user_id in self.bot_metrics:
                    self.bot_metrics[user_id].status = BotStatus.STOPPED
                    self.bot_metrics[user_id].current_action = "Bot gestoppt"

            self.logger.info(f"Bot für User {user_id} erfolgreich gestoppt")

            return {"success": True, "message": "Bot erfolgreich gestoppt"}

        except Exception as e:
            with self._lock:
                if user_id in self.bot_metrics:
                    self.bot_metrics[user_id].status = BotStatus.ERROR
                    self.bot_metrics[user_id].error_message = (
                        f"Fehler beim Stoppen: {str(e)}"
                    )

            self.logger.error(f"Fehler beim Stoppen des Bots für User {user_id}: {e}")
            return {"success": False, "message": f"Fehler beim Stoppen: {str(e)}"}

    def update_metrics(self, user_id: int, **kwargs):
        """Aktualisiert die Metriken für einen User-Bot"""
        with self._lock:
            if user_id in self.bot_metrics:
                metrics = self.bot_metrics[user_id]
                for key, value in kwargs.items():
                    if hasattr(metrics, key):
                        setattr(metrics, key, value)
                metrics.last_activity = datetime.now()

                # Runtime berechnen
                if metrics.started_at:
                    metrics.runtime_seconds = int(
                        (datetime.now() - metrics.started_at).total_seconds()
                    )

    def get_all_bot_statuses(self) -> List[Dict[str, Any]]:
        """Gibt den Status aller aktiven Bots zurück"""
        statuses = []
        with self._lock:
            for user_id in self.bot_metrics:
                statuses.append(self.get_bot_status(user_id))
        return statuses

    async def shutdown_all_bots(self):
        """Stoppt alle aktiven Bots (für Graceful Shutdown)"""
        self.logger.info("Stoppe alle aktiven Bots...")

        with self._lock:
            user_ids = list(self.user_bots.keys())

        for user_id in user_ids:
            try:
                await self.stop_bot(user_id)
            except Exception as e:
                self.logger.error(f"Fehler beim Stoppen von Bot {user_id}: {e}")

        self.logger.info("Alle Bots gestoppt")


# Globale Bot-Manager-Instanz
bot_manager = ImmobilienBotManager()
