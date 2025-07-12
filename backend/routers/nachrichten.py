from typing import List

from core.auth import get_current_active_user
from core.schemas import Nachricht, NachrichtCreate
from database.database import get_db
from models.nachricht import Nachricht as NachrichtModel
from models.user import User
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/nachrichten", tags=["nachrichten"])


@router.get("/", response_model=List[Nachricht])
def get_nachrichten(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    nachrichten = (
        db.query(NachrichtModel).filter(NachrichtModel.user_id == current_user.id).all()
    )
    return nachrichten


@router.post("/", response_model=Nachricht)
def create_nachricht(
    nachricht: NachrichtCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_nachricht = NachrichtModel(**nachricht.dict(), user_id=current_user.id)
    db.add(db_nachricht)
    db.commit()
    db.refresh(db_nachricht)
    return db_nachricht


@router.get("/{nachricht_id}", response_model=Nachricht)
def get_nachricht(
    nachricht_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    nachricht = (
        db.query(NachrichtModel)
        .filter(
            NachrichtModel.id == nachricht_id, NachrichtModel.user_id == current_user.id
        )
        .first()
    )
    if not nachricht:
        raise HTTPException(status_code=404, detail="Nachricht not found")
    return nachricht


@router.put("/{nachricht_id}/gelesen")
def mark_as_read(
    nachricht_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    nachricht = (
        db.query(NachrichtModel)
        .filter(
            NachrichtModel.id == nachricht_id, NachrichtModel.user_id == current_user.id
        )
        .first()
    )
    if not nachricht:
        raise HTTPException(status_code=404, detail="Nachricht not found")

    nachricht.ist_gelesen = True
    db.commit()
    return {"message": "Nachricht als gelesen markiert"}
