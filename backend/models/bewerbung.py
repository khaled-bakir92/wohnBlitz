import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.database import Base


class BewerbungsStatus(enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    RESPONDED = "responded"
    REJECTED = "rejected"


class Bewerbung(Base):
    __tablename__ = "bewerbungen"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wohnungsname = Column(String(200), nullable=False)
    adresse = Column(String(300), nullable=False)
    preis = Column(Numeric(10, 2))
    anzahl_zimmer = Column(Integer)
    status = Column(Enum(BewerbungsStatus), default=BewerbungsStatus.PENDING)
    bewerbungsdatum = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="bewerbungen")
    nachrichten = relationship("Nachricht", back_populates="bewerbung")
