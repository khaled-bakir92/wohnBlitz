from contextlib import asynccontextmanager

from core.logging_config import get_logger
from database.database import engine
from models import bewerbung, bot_status, nachricht, statistik, user
from routers import (
    admin,
    auth,
    bewerbungen,
    bot,
    filter,
    monitoring,
    nachrichten,
    statistiken,
    support,
)
from services.bot_maintenance import maintenance_service
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = get_logger("main")

# Datenbank-Tabellen erstellen
user.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle-Management für die FastAPI-Anwendung"""
    # Startup
    logger.info("Starte Wohnblitzer API...")

    # Wartungsservice starten
    await maintenance_service.start_maintenance(interval_minutes=30)

    logger.info("Wohnblitzer API erfolgreich gestartet")

    yield

    # Shutdown
    logger.info("Stoppe Wohnblitzer API...")

    # Wartungsservice stoppen
    await maintenance_service.stop_maintenance()

    # Bot-Manager cleanup wird automatisch durch den BotManager gemacht
    from services.immobilien_bot_manager import bot_manager

    await bot_manager.shutdown_all_bots()

    logger.info("Wohnblitzer API erfolgreich gestoppt")


app = FastAPI(
    title="Wohnblitzer API",
    description="FastAPI Backend für Wohnungsbewerbungen mit automatisierten Bots",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(bewerbungen.router)
app.include_router(statistiken.router)
app.include_router(nachrichten.router)
app.include_router(bot.router)
app.include_router(filter.router)
app.include_router(support.router)
app.include_router(monitoring.router)


@app.get("/")
def read_root():
    return {
        "message": "Wohnblitzer API is running",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/login, /api/register",
            "admin": "/api/users",
            "bot": "/api/bot/start, /api/bot/stop",
            "bewerbungen": "/api/bewerbungen",
            "filter": "/api/filter",
            "statistik": "/api/statistik",
            "support": "/api/support",
        },
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
