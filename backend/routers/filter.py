from typing import Optional

from core.auth import get_current_active_user
from database.database import get_db
from models.user import User
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/filter", tags=["filter"])


class FilterSettings(BaseModel):
    filter_einstellungen: str


class FilterResponse(BaseModel):
    filter_einstellungen: Optional[str] = None


@router.get("/", response_model=FilterResponse)
def get_filter_settings(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    return FilterResponse(filter_einstellungen=current_user.filter_einstellungen)


@router.post("/", response_model=FilterResponse)
def save_filter_settings(
    filter_data: FilterSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    current_user.filter_einstellungen = filter_data.filter_einstellungen
    db.commit()
    db.refresh(current_user)
    return FilterResponse(filter_einstellungen=current_user.filter_einstellungen)


@router.put("/", response_model=FilterResponse)
def update_filter_settings(
    filter_data: FilterSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    current_user.filter_einstellungen = filter_data.filter_einstellungen
    db.commit()
    db.refresh(current_user)
    return FilterResponse(filter_einstellungen=current_user.filter_einstellungen)


@router.delete("/")
def delete_filter_settings(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    current_user.filter_einstellungen = None
    db.commit()
    return {"message": "Filter settings deleted successfully"}
