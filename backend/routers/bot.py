from typing import Any, Dict, List

from core.auth import get_current_active_user, get_current_admin_user
from database.database import get_db
from models.bot_status import BotLog
from models.user import User
from services.immobilien_bot_manager import bot_manager
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/bot", tags=["bot"])


class BotConfigUpdate(BaseModel):
    filter_einstellungen: str = None
    bewerbungsprofil: str = None


@router.post("/start")
async def start_bot(
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """Startet den Bot für den aktuellen User"""
    return await bot_manager.start_bot(current_user.id)


@router.post("/stop")
async def stop_bot(
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """Stoppt den Bot für den aktuellen User"""
    return await bot_manager.stop_bot(current_user.id)


@router.get("/status")
def get_bot_status(
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """Gibt den aktuellen Bot-Status für den User zurück"""
    return bot_manager.get_bot_status(current_user.id)


@router.put("/config")
async def update_bot_config(
    config: BotConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """Aktualisiert die Bot-Konfiguration für den User"""
    try:
        # User-Konfiguration in Datenbank aktualisieren
        if config.filter_einstellungen is not None:
            current_user.filter_einstellungen = config.filter_einstellungen

        if config.bewerbungsprofil is not None:
            current_user.bewerbungsprofil = config.bewerbungsprofil

        db.commit()
        db.refresh(current_user)

        return {
            "success": True,
            "message": "Bot-Konfiguration erfolgreich aktualisiert",
            "filter_einstellungen": current_user.filter_einstellungen,
            "bewerbungsprofil": current_user.bewerbungsprofil,
        }

    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"Fehler beim Aktualisieren der Konfiguration: {str(e)}",
        }


@router.get("/logs")
def get_bot_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    level: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[Dict[str, Any]]:
    """Gibt die Bot-Logs für den aktuellen User zurück"""
    query = db.query(BotLog).filter(BotLog.user_id == current_user.id)

    if level:
        query = query.filter(BotLog.level == level.upper())

    logs = query.order_by(BotLog.timestamp.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": log.id,
            "level": log.level,
            "message": log.message,
            "action": log.action,
            "listing_id": log.listing_id,
            "details": log.details,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]


@router.delete("/logs")
def clear_bot_logs(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Löscht alle Bot-Logs für den aktuellen User"""
    try:
        deleted_count = (
            db.query(BotLog).filter(BotLog.user_id == current_user.id).delete()
        )
        db.commit()

        return {"success": True, "message": f"{deleted_count} Log-Einträge gelöscht"}

    except Exception as e:
        db.rollback()
        return {"success": False, "message": f"Fehler beim Löschen der Logs: {str(e)}"}


# Admin-Endpunkte
@router.get("/admin/status")
def get_all_bot_statuses(
    current_admin: User = Depends(get_current_admin_user),
) -> List[Dict[str, Any]]:
    """Admin: Gibt den Status aller Bots zurück"""
    return bot_manager.get_all_bot_statuses()


@router.post("/admin/stop-all")
async def stop_all_bots(
    current_admin: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """Admin: Stoppt alle aktiven Bots"""
    try:
        await bot_manager.shutdown_all_bots()
        return {"success": True, "message": "Alle Bots erfolgreich gestoppt"}
    except Exception as e:
        return {"success": False, "message": f"Fehler beim Stoppen der Bots: {str(e)}"}


@router.post("/admin/stop/{user_id}")
async def admin_stop_user_bot(
    user_id: int, current_admin: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Admin: Stoppt den Bot für einen bestimmten User"""
    return await bot_manager.stop_bot(user_id)


@router.get("/admin/logs/{user_id}")
def get_user_bot_logs(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    level: str = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
) -> List[Dict[str, Any]]:
    """Admin: Gibt die Bot-Logs für einen bestimmten User zurück"""
    query = db.query(BotLog).filter(BotLog.user_id == user_id)

    if level:
        query = query.filter(BotLog.level == level.upper())

    logs = query.order_by(BotLog.timestamp.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "level": log.level,
            "message": log.message,
            "action": log.action,
            "listing_id": log.listing_id,
            "details": log.details,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]
