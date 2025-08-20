import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.auth import get_current_active_user
from core.schemas import (
    BewerbungsprofilUpdate,
    Token,
    TokenRefresh,
    User,
    UserCreate,
    UserLogin,
)
from core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_token,
)
from database.database import get_db
from models.user import User as UserModel

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/register", response_model=User)
def register(user: UserCreate, db: Session = Depends(get_db)):
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


@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == user_credentials.email).first()

    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email, "is_admin": user.is_admin})
    refresh_token = create_refresh_token(data={"sub": user.email, "is_admin": user.is_admin})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "is_admin": user.is_admin,
        "profile_completed": user.profile_completed,
    }


@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email, "is_admin": user.is_admin})
    refresh_token = create_refresh_token(data={"sub": user.email, "is_admin": user.is_admin})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "is_admin": user.is_admin,
        "profile_completed": user.profile_completed,
    }


@router.post("/refresh", response_model=Token)
def refresh_access_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    try:
        # Verify the refresh token
        email = verify_token(token_data.refresh_token, token_type="refresh")

        # Check if user exists and is active
        user = db.query(UserModel).filter(UserModel.email == email).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create new tokens
        access_token = create_access_token(
            data={"sub": user.email, "is_admin": user.is_admin}
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email, "is_admin": user.is_admin}
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "is_admin": user.is_admin,
            "profile_completed": user.profile_completed,
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.put("/bewerbungsprofil", response_model=User)
def update_bewerbungsprofil(
    profil_data: BewerbungsprofilUpdate,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update user's Bewerbungsprofil (application profile)"""

    # Get existing bewerbungsprofil data or empty dict
    existing_profil = {}
    if current_user.bewerbungsprofil:
        try:
            existing_profil = json.loads(current_user.bewerbungsprofil)
        except json.JSONDecodeError:
            existing_profil = {}

    # Update with new data (only include non-None values)
    profil_dict = profil_data.dict(exclude_none=True)
    existing_profil.update(profil_dict)

    # Save updated profile as JSON string
    current_user.bewerbungsprofil = json.dumps(existing_profil, ensure_ascii=False)

    # Mark profile as completed
    current_user.profile_completed = True

    db.commit()
    db.refresh(current_user)

    return current_user


@router.get("/bewerbungsprofil")
def get_bewerbungsprofil(current_user: UserModel = Depends(get_current_active_user)):
    """Get user's current Bewerbungsprofil"""

    if not current_user.bewerbungsprofil:
        return {}

    try:
        return json.loads(current_user.bewerbungsprofil)
    except json.JSONDecodeError:
        return {}


@router.get("/me", response_model=User)
def get_current_user_info(current_user: UserModel = Depends(get_current_active_user)):
    """Get current user's information including admin status"""
    return current_user


@router.put("/filter-einstellungen", response_model=User)
def update_filter_einstellungen(
    filter_data: dict,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update user's filter settings"""

    # Get the filter settings from the request
    filter_einstellungen = filter_data.get("filter_einstellungen", "{}")

    # Update the user's filter settings
    current_user.filter_einstellungen = filter_einstellungen

    db.commit()
    db.refresh(current_user)

    return current_user
