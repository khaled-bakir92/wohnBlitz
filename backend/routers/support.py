from datetime import datetime
from typing import List, Optional

from core.auth import get_current_active_user, get_current_admin_user
from database.database import get_db
from models.nachricht import Nachricht as NachrichtModel
from models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/support", tags=["support"])


class SupportMessage(BaseModel):
    text: str
    betreff: Optional[str] = "Support-Anfrage"


class SupportMessageResponse(BaseModel):
    id: int
    absender: str
    text: str
    zeitstempel: datetime
    ist_gelesen: bool
    user_id: int
    betreff: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[SupportMessageResponse])
def get_support_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    only_unread: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Hole Support-Nachrichten für den aktuellen User"""
    query = db.query(NachrichtModel).filter(
        NachrichtModel.user_id == current_user.id,
        NachrichtModel.bewerbung_id.is_(
            None
        ),  # Support-Nachrichten haben keine Bewerbungs-ID
    )

    if only_unread:
        query = query.filter(NachrichtModel.ist_gelesen == False)

    nachrichten = (
        query.order_by(NachrichtModel.zeitstempel.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        SupportMessageResponse(
            id=msg.id,
            absender=msg.absender,
            text=msg.text,
            zeitstempel=msg.zeitstempel,
            ist_gelesen=msg.ist_gelesen,
            user_id=msg.user_id,
            betreff=msg.absender if hasattr(msg, "betreff") else "Support-Nachricht",
        )
        for msg in nachrichten
    ]


@router.post("/", response_model=SupportMessageResponse)
def send_support_message(
    message: SupportMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Sende eine Support-Nachricht an die Admins"""
    absender_name = (
        f"{current_user.vorname} {current_user.nachname} ({current_user.email})"
    )

    support_nachricht = NachrichtModel(
        user_id=current_user.id,
        absender=absender_name,
        text=message.text,
        bewerbung_id=None,  # Support-Nachrichten haben keine Bewerbungs-ID
        ist_gelesen=False,
    )

    db.add(support_nachricht)
    db.commit()
    db.refresh(support_nachricht)

    return SupportMessageResponse(
        id=support_nachricht.id,
        absender=support_nachricht.absender,
        text=support_nachricht.text,
        zeitstempel=support_nachricht.zeitstempel,
        ist_gelesen=support_nachricht.ist_gelesen,
        user_id=support_nachricht.user_id,
        betreff=message.betreff,
    )


@router.put("/{message_id}/read")
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Markiere eine Support-Nachricht als gelesen"""
    nachricht = (
        db.query(NachrichtModel)
        .filter(
            NachrichtModel.id == message_id,
            NachrichtModel.user_id == current_user.id,
            NachrichtModel.bewerbung_id.is_(None),
        )
        .first()
    )

    if not nachricht:
        raise HTTPException(status_code=404, detail="Support-Nachricht not found")

    nachricht.ist_gelesen = True
    db.commit()

    return {"message": "Nachricht als gelesen markiert"}


# Admin-Endpoints für Support-Verwaltung
@router.get("/admin/all", response_model=List[SupportMessageResponse])
def get_all_support_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    only_unread: bool = Query(False),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Hole alle Support-Nachrichten"""
    query = db.query(NachrichtModel).filter(NachrichtModel.bewerbung_id.is_(None))

    if only_unread:
        query = query.filter(NachrichtModel.ist_gelesen == False)

    if user_id:
        query = query.filter(NachrichtModel.user_id == user_id)

    nachrichten = (
        query.order_by(NachrichtModel.zeitstempel.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        SupportMessageResponse(
            id=msg.id,
            absender=msg.absender,
            text=msg.text,
            zeitstempel=msg.zeitstempel,
            ist_gelesen=msg.ist_gelesen,
            user_id=msg.user_id,
            betreff="Support-Anfrage",
        )
        for msg in nachrichten
    ]


@router.post("/admin/reply/{user_id}")
def admin_reply_to_user(
    user_id: int,
    message: SupportMessage,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Antworte auf eine Support-Anfrage"""
    # Prüfe ob User existiert
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    admin_name = f"Admin: {current_admin.vorname} {current_admin.nachname}"

    admin_nachricht = NachrichtModel(
        user_id=user_id,
        absender=admin_name,
        text=message.text,
        bewerbung_id=None,
        ist_gelesen=False,
    )

    db.add(admin_nachricht)
    db.commit()
    db.refresh(admin_nachricht)

    return {
        "message": "Antwort an User gesendet",
        "user_id": user_id,
        "admin_name": admin_name,
    }
