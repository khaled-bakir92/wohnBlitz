import asyncio
import atexit
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI

from core.logging_config import get_logger
from services.immobilien_bot_manager import bot_manager

logger = get_logger("lifecycle")


class ApplicationLifecycle:
    """
    Verwaltet den Lebenszyklus der Anwendung und stellt sicher,
    dass alle Bot-Prozesse ordnungsgemäß gestoppt werden
    """

    def __init__(self):
        self.shutdown_event = asyncio.Event()
        self.cleanup_tasks = []

    async def startup(self):
        """Wird beim Anwendungsstart ausgeführt"""
        logger.info("Starte Bot-System...")

        # Signal-Handler für ordnungsgemäßes Shutdown registrieren
        self.register_signal_handlers()

        logger.info("Bot-System erfolgreich gestartet")

    async def shutdown(self):
        """Wird beim Anwendungs-Shutdown ausgeführt"""
        logger.info("Stoppe Bot-System...")

        try:
            # Alle aktiven Bots stoppen
            await bot_manager.shutdown_all_bots()

            # Zusätzliche Cleanup-Tasks ausführen
            for task in self.cleanup_tasks:
                try:
                    await task()
                except Exception as e:
                    logger.error(f"Fehler beim Cleanup: {e}")

            logger.info("Bot-System erfolgreich gestoppt")

        except Exception as e:
            logger.error(f"Fehler beim Shutdown: {e}")

    def register_signal_handlers(self):
        """Registriert Signal-Handler für Graceful Shutdown"""

        def signal_handler(signum, frame):
            logger.info(f"Signal {signum} empfangen, initiiere Shutdown...")
            self.shutdown_event.set()

        # SIGTERM und SIGINT Handler registrieren
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)

        # Atexit-Handler für Notfall-Cleanup
        atexit.register(self.emergency_cleanup)

    def emergency_cleanup(self):
        """Notfall-Cleanup wenn normale Shutdown-Prozedur fehlschlägt"""
        logger.warning("Führe Notfall-Cleanup durch...")

        try:
            # Versuche synchronen Cleanup
            import asyncio

            if hasattr(asyncio, "_get_running_loop") and asyncio._get_running_loop():
                # Event Loop läuft bereits
                asyncio.create_task(bot_manager.shutdown_all_bots())
            else:
                # Neuen Event Loop für Cleanup erstellen
                asyncio.run(bot_manager.shutdown_all_bots())

        except Exception as e:
            logger.error(f"Notfall-Cleanup fehlgeschlagen: {e}")

    def add_cleanup_task(self, task):
        """Fügt eine Cleanup-Task hinzu"""
        self.cleanup_tasks.append(task)


# Globale Lifecycle-Instanz
lifecycle = ApplicationLifecycle()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI Lifespan Context Manager"""
    # Startup
    await lifecycle.startup()

    yield

    # Shutdown
    await lifecycle.shutdown()


def create_app_with_lifecycle() -> FastAPI:
    """Erstellt eine FastAPI-App mit Lifecycle-Management"""
    from main import app  # Import der bestehenden App

    # Lifecycle-Events zur bestehenden App hinzufügen
    app.router.lifespan_context = lifespan

    return app
