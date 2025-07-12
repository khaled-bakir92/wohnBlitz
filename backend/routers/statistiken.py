from datetime import datetime, timedelta
from typing import Any, Dict

from core.auth import get_current_active_user
from core.schemas import Statistik, StatistikCreate
from database.database import get_db
from models.bewerbung import Bewerbung as BewerbungModel
from models.bewerbung import BewerbungsStatus
from models.statistik import Statistik as StatistikModel
from models.user import User
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/statistik", tags=["statistik"])


@router.get("/")
def get_user_statistik(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    # Aktuelle Statistik aus Datenbank holen oder erstellen
    statistik = (
        db.query(StatistikModel)
        .filter(StatistikModel.user_id == current_user.id)
        .first()
    )
    if not statistik:
        statistik = StatistikModel(user_id=current_user.id)
        db.add(statistik)
        db.commit()
        db.refresh(statistik)

    # Live-Berechnungen aus Bewerbungen
    total_bewerbungen = (
        db.query(BewerbungModel)
        .filter(BewerbungModel.user_id == current_user.id)
        .count()
    )

    erfolgreiche_bewerbungen = (
        db.query(BewerbungModel)
        .filter(
            BewerbungModel.user_id == current_user.id,
            BewerbungModel.status == BewerbungsStatus.RESPONDED,
        )
        .count()
    )

    # Bewerbungen der letzten 30 Tage
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_bewerbungen = (
        db.query(BewerbungModel)
        .filter(
            BewerbungModel.user_id == current_user.id,
            BewerbungModel.bewerbungsdatum >= thirty_days_ago,
        )
        .count()
    )

    # Bewerbungen pro Tag (Durchschnitt der letzten 30 Tage)
    bewerbungen_pro_tag = (
        round(recent_bewerbungen / 30, 2) if recent_bewerbungen > 0 else 0
    )

    # Erfolgsquote berechnen
    erfolgsquote = (
        round((erfolgreiche_bewerbungen / total_bewerbungen * 100), 2)
        if total_bewerbungen > 0
        else 0
    )

    # Statistik aktualisieren
    statistik.anzahl_verschickter_bewerbungen = total_bewerbungen
    statistik.erfolgreiche_bewerbungen = erfolgreiche_bewerbungen
    statistik.bewerbungen_pro_tag = bewerbungen_pro_tag
    statistik.letzter_login = datetime.now()

    db.commit()
    db.refresh(statistik)

    return {
        "user_id": current_user.id,
        "anzahl_verschickter_bewerbungen": total_bewerbungen,
        "erfolgreiche_bewerbungen": erfolgreiche_bewerbungen,
        "bewerbungen_pro_tag": bewerbungen_pro_tag,
        "erfolgsquote_prozent": erfolgsquote,
        "bewerbungen_letzte_30_tage": recent_bewerbungen,
        "letzter_login": statistik.letzter_login,
        "mitglied_seit": current_user.created_at,
    }


@router.get("/dashboard")
def get_dashboard_statistik(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    # Erweiterte Dashboard-Statistiken

    # Bewerbungen nach Status
    status_counts = {}
    for status in BewerbungsStatus:
        count = (
            db.query(BewerbungModel)
            .filter(
                BewerbungModel.user_id == current_user.id,
                BewerbungModel.status == status,
            )
            .count()
        )
        status_counts[status.value] = count

    # Bewerbungen der letzten 7 Tage
    seven_days_ago = datetime.now() - timedelta(days=7)
    recent_week = (
        db.query(BewerbungModel)
        .filter(
            BewerbungModel.user_id == current_user.id,
            BewerbungModel.bewerbungsdatum >= seven_days_ago,
        )
        .count()
    )

    # Bewerbungen nach Monaten (letzten 6 Monate)
    monthly_stats = []
    for i in range(6):
        month_start = datetime.now().replace(day=1) - timedelta(days=30 * i)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(
            days=1
        )

        count = (
            db.query(BewerbungModel)
            .filter(
                BewerbungModel.user_id == current_user.id,
                BewerbungModel.bewerbungsdatum >= month_start,
                BewerbungModel.bewerbungsdatum <= month_end,
            )
            .count()
        )

        monthly_stats.append({"monat": month_start.strftime("%Y-%m"), "anzahl": count})

    return {
        "bewerbungen_nach_status": status_counts,
        "bewerbungen_letzte_7_tage": recent_week,
        "monatliche_statistik": monthly_stats[
            ::-1
        ],  # Umkehren für chronologische Reihenfolge
    }


@router.post("/update-login")
def update_letzter_login(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    statistik = (
        db.query(StatistikModel)
        .filter(StatistikModel.user_id == current_user.id)
        .first()
    )
    if not statistik:
        statistik = StatistikModel(user_id=current_user.id)
        db.add(statistik)

    statistik.letzter_login = datetime.now()
    db.commit()

    return {"message": "Login time updated", "letzter_login": statistik.letzter_login}
