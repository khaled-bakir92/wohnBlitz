from database.database import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Statistik(Base):
    __tablename__ = "statistiken"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    anzahl_verschickter_bewerbungen = Column(Integer, default=0)
    bewerbungen_pro_tag = Column(Integer, default=0)
    erfolgreiche_bewerbungen = Column(Integer, default=0)
    letzter_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="statistiken")
