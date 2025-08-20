from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_admin_user
from core.schemas import User, UserCreate
from core.security import get_password_hash
from database.database import get_db
from models.user import User as UserModel
from services.email_service import email_service

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


class EmailCreate(BaseModel):
    email: str
    vorname: str
    nachname: str
    is_admin: bool = False


class UserCreateResponse(BaseModel):
    user: User
    generated_password: str
    message: str


@router.post("/create-with-email")
def create_user_with_email(
    email_data: EmailCreate,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    """Create a new user with only email, generate random password"""
    try:
        import secrets
        import string

        # Check if user already exists
        db_user = (
            db.query(UserModel).filter(UserModel.email == email_data.email).first()
        )
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Generate random password
        password_length = 12
        password = "".join(
            secrets.choice(string.ascii_letters + string.digits + "!@#$%^&*")
            for _ in range(password_length)
        )

        print(f"Creating user with email: {email_data.email}")
        print(f"Vorname: {email_data.vorname}")
        print(f"Nachname: {email_data.nachname}")
        print(f"User should be admin: {email_data.is_admin}")
        print(f"is_admin type: {type(email_data.is_admin)}")

        hashed_password = get_password_hash(password)
        print("Password hashed successfully")

        db_user = UserModel(
            vorname=email_data.vorname,
            nachname=email_data.nachname,
            email=email_data.email,
            hashed_password=hashed_password,
            filter_einstellungen=None,
            bewerbungsprofil=None,
            is_admin=email_data.is_admin,
        )
        print(f"Before saving - db_user.is_admin: {db_user.is_admin}")

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        print(f"After saving - db_user.is_admin: {db_user.is_admin}")
        print("User saved to database")

        # Return simple response without complex serialization
        print("Preparing simple response")

        response_data = {
            "user": {
                "id": db_user.id,
                "email": db_user.email,
                "vorname": db_user.vorname or "",
                "nachname": db_user.nachname or "",
                "is_admin": db_user.is_admin,
                "is_active": db_user.is_active,
                "created_at": str(db_user.created_at) if db_user.created_at else None,
            },
            "generated_password": password,
            "message": "User created successfully",
        }

        return JSONResponse(content=response_data, status_code=200)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in create_user_with_email: {e}")
        print(f"Error type: {type(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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

    try:
        # Import the related models - use try/except for optional models
        print(f"Deleting related records for user {user.email}...")

        # Delete Nachrichten
        try:
            from models.nachricht import Nachricht

            nachrichten_count = (
                db.query(Nachricht).filter(Nachricht.user_id == user_id).count()
            )
            if nachrichten_count > 0:
                db.query(Nachricht).filter(Nachricht.user_id == user_id).delete()
                print(f"Deleted {nachrichten_count} Nachrichten")
        except ImportError:
            print("Nachricht model not found, skipping...")

        # Delete Bewerbungen
        try:
            from models.bewerbung import Bewerbung

            bewerbungen_count = (
                db.query(Bewerbung).filter(Bewerbung.user_id == user_id).count()
            )
            if bewerbungen_count > 0:
                db.query(Bewerbung).filter(Bewerbung.user_id == user_id).delete()
                print(f"Deleted {bewerbungen_count} Bewerbungen")
        except ImportError:
            print("Bewerbung model not found, skipping...")

        # Delete Statistiken
        try:
            from models.statistik import Statistik

            statistiken_count = (
                db.query(Statistik).filter(Statistik.user_id == user_id).count()
            )
            if statistiken_count > 0:
                db.query(Statistik).filter(Statistik.user_id == user_id).delete()
                print(f"Deleted {statistiken_count} Statistiken")
        except ImportError:
            print("Statistik model not found, skipping...")

        # Delete BotStatus
        try:
            from models.bot_status import BotStatus

            bot_status = (
                db.query(BotStatus).filter(BotStatus.user_id == user_id).first()
            )
            if bot_status:
                db.delete(bot_status)
                print("Deleted BotStatus")
        except ImportError:
            print("BotStatus model not found, skipping...")

        # Delete ChatMessages
        try:
            from models.chat import ChatMessage

            chat_messages_count = (
                db.query(ChatMessage).filter(ChatMessage.user_id == user_id).count()
            )
            if chat_messages_count > 0:
                db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
                print(f"Deleted {chat_messages_count} ChatMessages")
        except ImportError:
            print("ChatMessage model not found, skipping...")

        # Delete BotLogs
        try:
            from models.bot_status import BotLog

            bot_logs_count = db.query(BotLog).filter(BotLog.user_id == user_id).count()
            if bot_logs_count > 0:
                db.query(BotLog).filter(BotLog.user_id == user_id).delete()
                print(f"Deleted {bot_logs_count} BotLogs")
        except ImportError:
            print("BotLog model not found, skipping...")

        # Now delete the user
        db.delete(user)
        db.commit()

        print(f"Successfully deleted user {user.email}")
        return {"message": "User and all related data deleted successfully"}

    except Exception as e:
        db.rollback()
        print(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")


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


@router.put("/{user_id}/toggle-status")
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    """Toggle user active/inactive status"""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return {
        "message": f"User status set to {'active' if user.is_active else 'inactive'}",
        "is_active": user.is_active,
    }


@router.put("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    """Generate new password for user"""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        import secrets
        import string

        # Generate new random password
        password_length = 12
        new_password = "".join(
            secrets.choice(string.ascii_letters + string.digits + "!@#$%^&*")
            for _ in range(password_length)
        )

        # Hash and save new password
        hashed_password = get_password_hash(new_password)
        user.hashed_password = hashed_password

        db.commit()
        db.refresh(user)

        return {"message": "Password reset successfully", "new_password": new_password}

    except Exception as e:
        print(f"Error resetting password: {e}")
        raise HTTPException(status_code=500, detail="Error resetting password")


@router.post("/test-email")
def test_email_configuration(
    current_admin: UserModel = Depends(get_current_admin_user),
):
    """Admin: Testet die E-Mail-Konfiguration"""
    try:
        is_working = email_service.test_email_configuration()
        
        if is_working:
            return {
                "success": True,
                "message": "E-Mail-Konfiguration ist funktionsfähig"
            }
        else:
            return {
                "success": False,
                "message": "E-Mail-Konfiguration ist fehlerhaft"
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Fehler beim Testen der E-Mail-Konfiguration: {str(e)}"
        }
