import json
import logging
import os
from datetime import datetime
from typing import Any, Dict

from pythonjsonlogger import jsonlogger


class BotContextFilter(logging.Filter):
    """Logging-Filter für Bot-spezifische Kontextinformationen"""

    def __init__(self, user_id: int = None):
        super().__init__()
        self.user_id = user_id

    def filter(self, record):
        if self.user_id:
            record.user_id = self.user_id
        record.timestamp = datetime.now().isoformat()
        return True


class StructuredLogger:
    """
    Strukturiertes Logging für Bot-Aktivitäten
    Unterstützt sowohl lokale Logs als auch Datenbank-Logging
    """

    def __init__(self, name: str, user_id: int = None):
        self.name = name
        self.user_id = user_id
        self.logger = logging.getLogger(f"bot.{name}")

        # Setup strukturiertes Logging
        self.setup_logger()

    def setup_logger(self):
        """Konfiguriert den Logger mit strukturiertem Output"""

        # Formatter für JSON-Logs
        json_formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(user_id)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        # Console Handler mit JSON-Format
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(json_formatter)
        console_handler.addFilter(BotContextFilter(self.user_id))

        # File Handler für Bot-Logs
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)

        if self.user_id:
            log_file = os.path.join(log_dir, f"bot_user_{self.user_id}.log")
        else:
            log_file = os.path.join(log_dir, "bot_manager.log")

        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(json_formatter)
        file_handler.addFilter(BotContextFilter(self.user_id))

        # Logger konfigurieren
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)

        # Verhindere doppelte Logs
        self.logger.propagate = False

    def info(self, message: str, **kwargs):
        """Info-Level Log mit optionalen Kontext-Daten"""
        extra = self._prepare_extra(**kwargs)
        self.logger.info(message, extra=extra)

    def warning(self, message: str, **kwargs):
        """Warning-Level Log mit optionalen Kontext-Daten"""
        extra = self._prepare_extra(**kwargs)
        self.logger.warning(message, extra=extra)

    def error(self, message: str, **kwargs):
        """Error-Level Log mit optionalen Kontext-Daten"""
        extra = self._prepare_extra(**kwargs)
        self.logger.error(message, extra=extra)

    def debug(self, message: str, **kwargs):
        """Debug-Level Log mit optionalen Kontext-Daten"""
        extra = self._prepare_extra(**kwargs)
        self.logger.debug(message, extra=extra)

    def _prepare_extra(self, **kwargs) -> Dict[str, Any]:
        """Bereitet zusätzliche Log-Daten vor"""
        extra = {}

        if kwargs:
            # Konvertiere komplexe Objekte zu JSON-serialisierbaren Formaten
            for key, value in kwargs.items():
                if isinstance(value, (dict, list)):
                    extra[key] = json.dumps(value)
                else:
                    extra[key] = str(value)

        return extra


class BotMetrics:
    """
    Sammelt und verwaltet Bot-Metriken für Monitoring
    """

    def __init__(self):
        self.metrics = {}
        self.start_time = datetime.now()

    def increment_counter(self, metric_name: str, user_id: int = None, amount: int = 1):
        """Erhöht einen Zähler-Metric"""
        key = f"{metric_name}_{user_id}" if user_id else metric_name
        self.metrics[key] = self.metrics.get(key, 0) + amount

    def set_gauge(self, metric_name: str, value: float, user_id: int = None):
        """Setzt einen Gauge-Metric"""
        key = f"{metric_name}_{user_id}" if user_id else metric_name
        self.metrics[key] = value

    def record_timing(
        self, metric_name: str, duration_seconds: float, user_id: int = None
    ):
        """Zeichnet eine Timing-Metrik auf"""
        key = f"{metric_name}_timing_{user_id}" if user_id else f"{metric_name}_timing"
        if key not in self.metrics:
            self.metrics[key] = []
        self.metrics[key].append(duration_seconds)

    def get_metrics(self) -> Dict[str, Any]:
        """Gibt alle gesammelten Metriken zurück"""
        runtime = (datetime.now() - self.start_time).total_seconds()

        return {
            "runtime_seconds": runtime,
            "metrics": self.metrics,
            "collected_at": datetime.now().isoformat(),
        }

    def reset_metrics(self):
        """Setzt alle Metriken zurück"""
        self.metrics = {}
        self.start_time = datetime.now()


# Globale Metriken-Instanz
bot_metrics = BotMetrics()


def get_logger(name: str, user_id: int = None) -> StructuredLogger:
    """Factory-Funktion für strukturierte Logger"""
    return StructuredLogger(name, user_id)


def setup_root_logging():
    """Konfiguriert das Root-Logging für die gesamte Anwendung"""

    # Root Logger konfigurieren
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)

    # File Handler für allgemeine Logs
    os.makedirs("logs", exist_ok=True)
    file_handler = logging.FileHandler("logs/application.log")
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    # Handler hinzufügen
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Selenium-Logs reduzieren
    logging.getLogger("selenium").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


# Logging beim Import konfigurieren
setup_root_logging()
