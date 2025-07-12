from database.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class BotStatus(Base):
    __tablename__ = "bot_status"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    status = Column(
        String(20), nullable=False, default="stopped"
    )  # stopped, starting, running, paused, error, stopping
    listings_found = Column(Integer, default=0)
    applications_sent = Column(Integer, default=0)
    last_activity = Column(DateTime(timezone=True))
    current_action = Column(String(500))
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    runtime_seconds = Column(Integer, default=0)
    config_hash = Column(String(64))  # Hash der aktuellen Konfiguration
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="bot_status")


class BotLog(Base):
    __tablename__ = "bot_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    level = Column(String(20), nullable=False)  # INFO, WARNING, ERROR, DEBUG
    message = Column(Text, nullable=False)
    action = Column(String(100))  # start, stop, crawl, apply, error
    listing_id = Column(String(100))  # Optional: ID des verarbeiteten Angebots
    details = Column(Text)  # JSON mit zusätzlichen Details
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bot_logs")
