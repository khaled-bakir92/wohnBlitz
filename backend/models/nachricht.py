from database.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Nachricht(Base):
    __tablename__ = "nachrichten"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bewerbung_id = Column(Integer, ForeignKey("bewerbungen.id"), nullable=True)
    absender = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    zeitstempel = Column(DateTime(timezone=True), server_default=func.now())
    ist_gelesen = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="nachrichten")
    bewerbung = relationship("Bewerbung", back_populates="nachrichten")
