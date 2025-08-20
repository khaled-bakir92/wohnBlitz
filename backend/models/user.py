from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    vorname = Column(String(50), nullable=False)
    nachname = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    profile_completed = Column(Boolean, default=False)
    filter_einstellungen = Column(Text)
    bewerbungsprofil = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    bewerbungen = relationship("Bewerbung", back_populates="user")
    statistiken = relationship("Statistik", back_populates="user")
    nachrichten = relationship("Nachricht", back_populates="user")
    bot_status = relationship("BotStatus", back_populates="user", uselist=False)
    bot_logs = relationship("BotLog", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
