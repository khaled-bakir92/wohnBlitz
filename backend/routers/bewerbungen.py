from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import get_current_active_user, get_current_user_with_profile
from core.schemas import Bewerbung, BewerbungCreate
from database.database import get_db
from models.bewerbung import Bewerbung as BewerbungModel
from models.bewerbung import BewerbungsStatus
from models.user import User

router = APIRouter(prefix="/api/bewerbungen", tags=["bewerbungen"])


@router.get("/", response_model=List[Bewerbung])
def get_bewerbungen(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_profile),
):
    query = db.query(BewerbungModel).filter(BewerbungModel.user_id == current_user.id)

    if status:
        try:
            status_enum = BewerbungsStatus(status)
            query = query.filter(BewerbungModel.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")

    bewerbungen = query.offset(skip).limit(limit).all()
    return bewerbungen


@router.post("/", response_model=Bewerbung)
def create_bewerbung(
    bewerbung: BewerbungCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_bewerbung = BewerbungModel(**bewerbung.dict(), user_id=current_user.id)
    db.add(db_bewerbung)
    db.commit()
    db.refresh(db_bewerbung)
    return db_bewerbung


@router.get("/{bewerbung_id}", response_model=Bewerbung)
def get_bewerbung_details(
    bewerbung_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    bewerbung = (
        db.query(BewerbungModel)
        .filter(
            BewerbungModel.id == bewerbung_id, BewerbungModel.user_id == current_user.id
        )
        .first()
    )
    if not bewerbung:
        raise HTTPException(status_code=404, detail="Bewerbung not found")
    return bewerbung


@router.put("/{bewerbung_id}", response_model=Bewerbung)
def update_bewerbung(
    bewerbung_id: int,
    bewerbung_update: BewerbungCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    bewerbung = (
        db.query(BewerbungModel)
        .filter(
            BewerbungModel.id == bewerbung_id, BewerbungModel.user_id == current_user.id
        )
        .first()
    )
    if not bewerbung:
        raise HTTPException(status_code=404, detail="Bewerbung not found")

    for field, value in bewerbung_update.dict(exclude_unset=True).items():
        setattr(bewerbung, field, value)

    db.commit()
    db.refresh(bewerbung)
    return bewerbung


@router.put("/{bewerbung_id}/status")
def update_bewerbung_status(
    bewerbung_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    bewerbung = (
        db.query(BewerbungModel)
        .filter(
            BewerbungModel.id == bewerbung_id, BewerbungModel.user_id == current_user.id
        )
        .first()
    )
    if not bewerbung:
        raise HTTPException(status_code=404, detail="Bewerbung not found")

    try:
        status_enum = BewerbungsStatus(status)
        bewerbung.status = status_enum
        db.commit()
        db.refresh(bewerbung)
        return {"message": "Status updated successfully", "new_status": status}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")


@router.delete("/{bewerbung_id}")
def delete_bewerbung(
    bewerbung_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    bewerbung = (
        db.query(BewerbungModel)
        .filter(
            BewerbungModel.id == bewerbung_id, BewerbungModel.user_id == current_user.id
        )
        .first()
    )
    if not bewerbung:
        raise HTTPException(status_code=404, detail="Bewerbung not found")

    db.delete(bewerbung)
    db.commit()
    return {"message": "Bewerbung deleted successfully"}
