from database.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum


class MessageType(enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SYSTEM = "system"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(36), nullable=False, index=True)  # UUID für Konversations-Gruppierung
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_type = Column(Enum(MessageType), nullable=False)
    sender_id = Column(Integer, nullable=True)  # ID des Admins wenn sender_type=ADMIN
    sender_name = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    reply_to_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)  # Für Antworten
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="chat_messages")
    reply_to = relationship("ChatMessage", remote_side=[id])


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(String(36), primary_key=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(200), default="Support-Anfrage")
    status = Column(String(20), default="open")  # open, closed, pending
    priority = Column(String(10), default="normal")  # low, normal, high, urgent
    assigned_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assigned_admin = relationship("User", foreign_keys=[assigned_admin_id])