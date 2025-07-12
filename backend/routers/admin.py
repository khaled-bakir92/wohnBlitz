from typing import List

from core.auth import get_current_admin_user
from core.schemas import User, UserCreate
from core.security import get_password_hash
from database.database import get_db
from models.user import User as UserModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/users", tags=["admin"])


@router.get("/", response_model=List[User])
def get_all_users(
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    users = db.query(UserModel).all()
    return users


@router.post("/", response_model=User)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        vorname=user.vorname,
        nachname=user.nachname,
        email=user.email,
        hashed_password=hashed_password,
        filter_einstellungen=user.filter_einstellungen,
        bewerbungsprofil=user.bewerbungsprofil,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/{user_id}", response_model=User)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=User)
def update_user(
    user_id: int,
    user_update: UserCreate,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in user_update.dict(exclude_unset=True).items():
        if field == "password":
            value = get_password_hash(value)
            field = "hashed_password"
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@router.put("/{user_id}/admin")
def toggle_admin_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    return {
        "message": f"User admin status set to {user.is_admin}",
        "is_admin": user.is_admin,
    }
