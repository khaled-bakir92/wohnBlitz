from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.auth import get_current_admin_user
from core.logging_config import bot_metrics
from database.database import get_db
from models.bewerbung import Bewerbung, BewerbungsStatus
from models.bot_status import BotLog
from models.user import User
from services.immobilien_bot_manager import bot_manager

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.get("/health")
def health_check() -> Dict[str, Any]:
    """Basis Health Check für das Bot-System"""
    try:
        # Bot-Manager Status prüfen
        all_statuses = bot_manager.get_all_bot_statuses()
        active_bots = len([s for s in all_statuses if s["status"] == "running"])

        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "active_bots": active_bots,
            "total_tracked_bots": len(all_statuses),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
        }


@router.get("/metrics")
def get_system_metrics(
    current_admin: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """Admin: System-weite Metriken"""
    try:
        # Bot-Manager Metriken
        collected_metrics = bot_metrics.get_metrics()

        # Bot-Status Übersicht
        all_statuses = bot_manager.get_all_bot_statuses()
        status_counts = {}
        total_applications = 0
        total_listings = 0

        for status in all_statuses:
            status_name = status["status"]
            status_counts[status_name] = status_counts.get(status_name, 0) + 1
            total_applications += status.get("applications_sent", 0)
            total_listings += status.get("listings_found", 0)

        return {
            "system_metrics": collected_metrics,
            "bot_status_overview": {
                "status_distribution": status_counts,
                "total_applications_sent": total_applications,
                "total_listings_found": total_listings,
                "active_bots": len(all_statuses),
            },
            "collected_at": datetime.now().isoformat(),
        }

    except Exception as e:
        return {
            "error": f"Fehler beim Sammeln der Metriken: {str(e)}",
            "timestamp": datetime.now().isoformat(),
        }


@router.get("/statistics")
def get_detailed_statistics(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """Admin: Detaillierte Statistiken über Bot-Aktivitäten"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Bewerbungsstatistiken
        total_applications = (
            db.query(Bewerbung).filter(Bewerbung.bewerbungsdatum >= start_date).count()
        )

        successful_applications = (
            db.query(Bewerbung)
            .filter(
                Bewerbung.bewerbungsdatum >= start_date,
                Bewerbung.status == BewerbungsStatus.SENT,
            )
            .count()
        )

        # Bewerbungen pro Tag
        daily_applications = (
            db.query(
                func.date(Bewerbung.bewerbungsdatum).label("date"),
                func.count(Bewerbung.id).label("count"),
            )
            .filter(Bewerbung.bewerbungsdatum >= start_date)
            .group_by(func.date(Bewerbung.bewerbungsdatum))
            .all()
        )

        # Status-Verteilung
        status_distribution = (
            db.query(Bewerbung.status, func.count(Bewerbung.id).label("count"))
            .filter(Bewerbung.bewerbungsdatum >= start_date)
            .group_by(Bewerbung.status)
            .all()
        )

        # Top aktive User
        top_users = (
            db.query(
                Bewerbung.user_id, func.count(Bewerbung.id).label("application_count")
            )
            .filter(Bewerbung.bewerbungsdatum >= start_date)
            .group_by(Bewerbung.user_id)
            .order_by(func.count(Bewerbung.id).desc())
            .limit(10)
            .all()
        )

        # Log-Statistiken
        error_logs = (
            db.query(BotLog)
            .filter(BotLog.timestamp >= start_date, BotLog.level == "ERROR")
            .count()
        )

        warning_logs = (
            db.query(BotLog)
            .filter(BotLog.timestamp >= start_date, BotLog.level == "WARNING")
            .count()
        )

        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days,
            },
            "application_statistics": {
                "total_applications": total_applications,
                "successful_applications": successful_applications,
                "success_rate": (
                    round((successful_applications / total_applications * 100), 2)
                    if total_applications > 0
                    else 0
                ),
                "daily_breakdown": [
                    {"date": str(day.date), "count": day.count}
                    for day in daily_applications
                ],
                "status_distribution": [
                    {"status": status.status.value, "count": status.count}
                    for status in status_distribution
                ],
            },
            "user_activity": [
                {"user_id": user.user_id, "applications": user.application_count}
                for user in top_users
            ],
            "system_health": {
                "error_logs": error_logs,
                "warning_logs": warning_logs,
                "error_rate": round(
                    (error_logs / (error_logs + warning_logs + 1) * 100), 2
                ),
            },
        }

    except Exception as e:
        return {
            "error": f"Fehler beim Generieren der Statistiken: {str(e)}",
            "timestamp": datetime.now().isoformat(),
        }


@router.get("/alerts")
def get_system_alerts(
    db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)
) -> List[Dict[str, Any]]:
    """Admin: System-Alerts und Warnungen"""
    alerts = []

    try:
        # Prüfe auf häufige Fehler in den letzten 24 Stunden
        last_24h = datetime.now() - timedelta(hours=24)

        error_count = (
            db.query(BotLog)
            .filter(BotLog.timestamp >= last_24h, BotLog.level == "ERROR")
            .count()
        )

        if error_count > 50:  # Schwellenwert für Alerts
            alerts.append(
                {
                    "type": "high_error_rate",
                    "severity": "warning",
                    "message": f"Hohe Fehlerrate: {error_count} Fehler in den letzten 24 Stunden",
                    "count": error_count,
                    "timestamp": datetime.now().isoformat(),
                }
            )

        # Prüfe auf gestoppte Bots
        all_statuses = bot_manager.get_all_bot_statuses()
        stopped_bots = [s for s in all_statuses if s["status"] == "error"]

        if stopped_bots:
            alerts.append(
                {
                    "type": "bots_in_error_state",
                    "severity": "error",
                    "message": f"{len(stopped_bots)} Bot(s) im Fehlerzustand",
                    "affected_users": [bot["user_id"] for bot in stopped_bots],
                    "timestamp": datetime.now().isoformat(),
                }
            )

        # Prüfe auf User ohne Aktivität
        last_week = datetime.now() - timedelta(days=7)

        inactive_users = (
            db.query(User)
            .filter(
                ~User.id.in_(
                    db.query(Bewerbung.user_id)
                    .filter(Bewerbung.bewerbungsdatum >= last_week)
                    .distinct()
                ),
                User.is_active.is_(True),
            )
            .count()
        )

        if inactive_users > 0:
            alerts.append(
                {
                    "type": "inactive_users",
                    "severity": "info",
                    "message": f"{inactive_users} aktive User ohne Bot-Aktivität in den letzten 7 Tagen",
                    "count": inactive_users,
                    "timestamp": datetime.now().isoformat(),
                }
            )

        return alerts

    except Exception as e:
        return [
            {
                "type": "monitoring_error",
                "severity": "error",
                "message": f"Fehler beim Generieren der Alerts: {str(e)}",
                "timestamp": datetime.now().isoformat(),
            }
        ]


@router.post("/reset-metrics")
def reset_system_metrics(
    current_admin: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """Admin: Setzt System-Metriken zurück"""
    try:
        bot_metrics.reset_metrics()

        return {
            "success": True,
            "message": "System-Metriken erfolgreich zurückgesetzt",
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Fehler beim Zurücksetzen der Metriken: {str(e)}",
            "timestamp": datetime.now().isoformat(),
        }
