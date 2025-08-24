from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

from database.database import Base


class ActivityType(str, Enum):
    USER_REGISTERED = "user_registered"
    USER_BLOCKED = "user_blocked"
    USER_UNBLOCKED = "user_unblocked"
    BOT_STARTED = "bot_started"
    BOT_STOPPED = "bot_stopped"
    USER_LOGIN = "user_login"
    APPLICATION_SENT = "application_sent"


class AdminActivity(Base):
    __tablename__ = "admin_activities"

    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to User
    user = relationship("User", backref="activities")