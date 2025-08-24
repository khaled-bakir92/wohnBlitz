from typing import List
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.auth import get_current_admin_user
from core.schemas import User, UserCreate
from core.security import get_password_hash
from database.database import get_db
from models.user import User as UserModel
from models.admin_activity import AdminActivity, ActivityType
from models.bewerbung import Bewerbung as BewerbungModel
from models.bot_status import BotStatus
from services.email_service import email_service

router = APIRouter(prefix="/api/users", tags=["admin"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin-dashboard"])


@router.get("/", response_model=List[User])
async def get_all_users(
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    users = db.query(UserModel).all()
    return users


@router.post("/", response_model=User)
async def create_user(
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

class DashboardStatsResponse(BaseModel):
    stats: dict = Field(..., description="Dashboard statistics")
    weekly_chart_data: List[dict] = Field(default_factory=list, description="Weekly chart data")


class ActivityResponse(BaseModel):
    activities: List[dict] = Field(default_factory=list, description="Recent activities")


@router.post("/create-with-email")
async def create_user_with_email(
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
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=User)
async def update_user(
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
async def delete_user(
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
async def toggle_admin_status(
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
async def toggle_user_status(
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
    user.updated_at = datetime.now()
    db.commit()
    db.refresh(user)
    
    # Log activity
    activity_type = ActivityType.USER_BLOCKED if not user.is_active else ActivityType.USER_UNBLOCKED
    await log_admin_activity(
        db, 
        activity_type.value, 
        user.id, 
        user.email, 
        f"Benutzer {'blockiert' if not user.is_active else 'entblockiert'} von Admin {current_admin.email}"
    )
    
    return {
        "message": f"User status set to {'active' if user.is_active else 'inactive'}",
        "is_active": user.is_active,
    }


@router.put("/{user_id}/reset-password")
async def reset_user_password(
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
async def test_email_configuration(
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


@admin_router.get("/dashboard-stats", response_model=DashboardStatsResponse)
async def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    """Get statistics for admin dashboard"""
    try:
        print("Starting dashboard stats query...")
        
        # Use optimized queries with indexes
        # Alle Benutzer (statt nur aktive) - mit Index optimization
        total_users = db.query(func.count(UserModel.id)).scalar() or 0
        print(f"Total users: {total_users}")

        # Laufende Bots - mit Index optimization
        try:
            running_bots = db.query(func.count(BotStatus.id)).filter(
                BotStatus.status == "running"
            ).scalar() or 0
            print(f"Running bots: {running_bots}")
        except Exception as e:
            print(f"Error querying bot status: {e}")
            running_bots = 0

        # Anzahl Bewerbungen letzte 24 Stunden - optimized
        twenty_four_hours_ago = datetime.now() - timedelta(hours=24)
        try:
            daily_applications = db.query(func.count(BewerbungModel.id)).filter(
                BewerbungModel.bewerbungsdatum >= twenty_four_hours_ago
            ).scalar() or 0
            print(f"Daily applications: {daily_applications}")
        except Exception as e:
            print(f"Error querying applications: {e}")
            daily_applications = 0

        # Blockierte Benutzer - optimized
        blocked_users = db.query(func.count(UserModel.id)).filter(
            UserModel.is_active is False
        ).scalar() or 0
        print(f"Blocked users: {blocked_users}")

        # Neue Registrierungen diese Woche - optimized
        one_week_ago = datetime.now() - timedelta(days=7)
        weekly_registrations = db.query(func.count(UserModel.id)).filter(
            UserModel.created_at >= one_week_ago
        ).scalar() or 0
        print(f"Weekly registrations: {weekly_registrations}")

        # Wochenstatistiken für Chart - optimized bulk query
        weekly_chart_data = []
        try:
            # Optimized approach: get all data in fewer queries
            week_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6)
            
            # Bulk query for users with date grouping
            user_counts = db.query(
                func.date(UserModel.created_at).label('date'),
                func.count(UserModel.id).label('count')
            ).filter(
                UserModel.created_at >= week_start
            ).group_by(func.date(UserModel.created_at)).all()
            
            # Convert to dict for faster lookup
            user_count_dict = {str(row.date): row.count for row in user_counts}
            
            # Bulk query for applications with date grouping
            app_count_dict = {}
            try:
                app_counts = db.query(
                    func.date(BewerbungModel.bewerbungsdatum).label('date'),
                    func.count(BewerbungModel.id).label('count')
                ).filter(
                    BewerbungModel.bewerbungsdatum >= week_start
                ).group_by(func.date(BewerbungModel.bewerbungsdatum)).all()
                
                app_count_dict = {str(row.date): row.count for row in app_counts}
            except Exception as e:
                print(f"Error querying bulk applications: {e}")
            
            # Build chart data from cached results
            for i in range(7):
                day_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
                day_key = str(day_start.date())
                
                users_count = user_count_dict.get(day_key, 0)
                applications_count = app_count_dict.get(day_key, 0)
                
                weekday = day_start.strftime('%a')
                day_name_mapping = {
                    'Mon': 'Mo', 'Tue': 'Di', 'Wed': 'Mi', 'Thu': 'Do',
                    'Fri': 'Fr', 'Sat': 'Sa', 'Sun': 'So'
                }
                day_name = day_name_mapping.get(weekday, weekday)
                
                weekly_chart_data.append({
                    "day": day_name,
                    "users": users_count,
                    "applications": applications_count,
                    "userHeight": max(min(users_count * 8, 120), 8),
                    "appHeight": max(min(applications_count * 2, 120), 8)
                })
            
            # Reverse für chronologische Reihenfolge
            weekly_chart_data.reverse()
        except Exception as e:
            print(f"Error generating weekly chart data: {e}")
            weekly_chart_data = []

        return {
            "stats": {
                "total_users": total_users,
                "running_bots": running_bots,
                "daily_applications": daily_applications,
                "blocked_users": blocked_users,
                "weekly_registrations": weekly_registrations
            },
            "weekly_chart_data": weekly_chart_data
        }

    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting dashboard stats: {str(e)}")


async def log_admin_activity(db: Session, activity_type: str, user_id: int = None, user_email: str = None, description: str = ""):
    """Helper function to log admin activities"""
    try:
        activity = AdminActivity(
            activity_type=activity_type,
            user_id=user_id,
            user_email=user_email,
            description=description
        )
        db.add(activity)
        db.commit()
    except Exception as e:
        print(f"Error logging admin activity: {e}")


@admin_router.get("/recent-activities", response_model=ActivityResponse)
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=20), # Reduced max limit for performance
    db: Session = Depends(get_db),
    current_admin: UserModel = Depends(get_current_admin_user),
):
    """Get recent activities for admin dashboard"""
    try:
        print("Starting recent activities query...")
        activities = []
        
        # Zeitraum für Aktivitäten erweitern (letzte 7 Tage statt 24h)
        one_week_ago = datetime.now() - timedelta(days=7)
        print(f"Looking for activities since: {one_week_ago}")
        
        # Optimized: Neue Registrierungen with index hints
        new_users = db.query(UserModel).filter(
            UserModel.created_at >= one_week_ago
        ).order_by(UserModel.created_at.desc()).limit(5).all() # Reduced to 5 for performance
        
        for user in new_users:
            time_diff = datetime.now() - user.created_at
            if time_diff.days > 0:
                time_str = f"vor {time_diff.days} Tag{'en' if time_diff.days > 1 else ''}"
            elif time_diff.seconds < 3600:
                time_str = f"vor {max(1, time_diff.seconds // 60)} Minuten"
            else:
                time_str = f"vor {time_diff.seconds // 3600} Stunden"
                
            activities.append({
                "activity": "Neue Benutzer Registrierung",
                "user": user.email,
                "time": time_str,
                "type": "Registrierung",
                "typeColor": "#34c759",
                "timestamp": user.created_at
            })

        # Bot Aktivitäten - alle Bot Status Änderungen (optimized query)
        try:
            # Limit to more recent timeframe for performance
            recent_timeframe = datetime.now() - timedelta(hours=72)  # Last 3 days instead of 7
            all_bot_statuses = db.query(BotStatus).filter(
                BotStatus.updated_at >= recent_timeframe
            ).order_by(BotStatus.updated_at.desc()).limit(5).all()
            print(f"Found {len(all_bot_statuses)} bot status changes")
            
            for bot_status in all_bot_statuses:
                if bot_status.user_id:
                    # Get user separately to avoid join overhead
                    user = db.query(UserModel).filter(UserModel.id == bot_status.user_id).first()
                    if user:
                        time_diff = datetime.now() - bot_status.updated_at
                        if time_diff.days > 0:
                            time_str = f"vor {time_diff.days} Tag{'en' if time_diff.days > 1 else ''}"
                        elif time_diff.seconds < 3600:
                            time_str = f"vor {max(1, time_diff.seconds // 60)} Minuten"
                        else:
                            time_str = f"vor {time_diff.seconds // 3600} Stunden"
                            
                        activity_text = "Bot gestartet" if bot_status.status == "running" else "Bot gestoppt"
                        activities.append({
                            "activity": activity_text,
                            "user": user.email,
                            "time": time_str,
                            "type": "Bot Aktivität",
                            "typeColor": "#007aff",
                            "timestamp": bot_status.updated_at
                        })
        except Exception as e:
            print(f"Error querying bot activities: {e}")

        # Blockierte/Entblockierte Benutzer
        recently_changed_users = db.query(UserModel).filter(
            UserModel.updated_at >= one_week_ago
        ).order_by(UserModel.updated_at.desc()).limit(10).all()
        
        for user in recently_changed_users:
            # Nur wenn sich der Status geändert hat
            if user.created_at != user.updated_at:
                time_diff = datetime.now() - user.updated_at
                if time_diff.days > 0:
                    time_str = f"vor {time_diff.days} Tag{'en' if time_diff.days > 1 else ''}"
                elif time_diff.seconds < 3600:
                    time_str = f"vor {max(1, time_diff.seconds // 60)} Minuten"
                else:
                    time_str = f"vor {time_diff.seconds // 3600} Stunden"
                    
                activity_text = "Benutzer blockiert" if not user.is_active else "Benutzer entblockiert"
                color = "#ff3b30" if not user.is_active else "#34c759"
                activities.append({
                    "activity": activity_text,
                    "user": user.email,
                    "time": time_str,
                    "type": "Moderation",
                    "typeColor": color,
                    "timestamp": user.updated_at
                })

        # Bewerbungen der letzten 24 Stunden (optimized)
        try:
            # Simple query without join first, then get user data separately if needed
            recent_applications = db.query(BewerbungModel).filter(
                BewerbungModel.bewerbungsdatum >= datetime.now() - timedelta(hours=24)
            ).order_by(BewerbungModel.bewerbungsdatum.desc()).limit(3).all()
            print(f"Found {len(recent_applications)} recent applications")
            
            for bewerbung in recent_applications:
                if bewerbung.user_id:
                    # Get user separately to avoid join overhead
                    user = db.query(UserModel).filter(UserModel.id == bewerbung.user_id).first()
                    if user:
                        time_diff = datetime.now() - bewerbung.bewerbungsdatum
                        if time_diff.seconds < 3600:
                            time_str = f"vor {max(1, time_diff.seconds // 60)} Minuten"
                        else:
                            time_str = f"vor {time_diff.seconds // 3600} Stunden"
                            
                        activities.append({
                            "activity": "Bewerbung versendet",
                            "user": user.email,
                            "time": time_str,
                            "type": "Bewerbung",
                            "typeColor": "#ff9500",
                            "timestamp": bewerbung.bewerbungsdatum
                        })
        except Exception as e:
            print(f"Error querying recent applications: {e}")

        # Sortiere nach Zeitstempel (neueste zuerst)
        activities.sort(key=lambda x: x.get("timestamp", datetime.min), reverse=True)
        print(f"Returning {len(activities)} activities")
        
        return {"activities": activities[:limit]}

    except Exception as e:
        print(f"Error getting recent activities: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting recent activities: {str(e)}")
