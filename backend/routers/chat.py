import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from core.auth import get_current_active_user, get_current_admin_user
from database.database import get_db
from models.chat import ChatConversation, ChatMessage, MessageType
from models.user import User

router = APIRouter(prefix="/api/chat", tags=["chat"])


# Pydantic Models
class ChatMessageCreate(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    reply_to_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: str
    sender_type: str
    sender_name: str
    message: str
    is_read: bool
    reply_to_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: str
    user_id: int
    user_name: str
    subject: str
    status: str
    priority: str
    last_message_at: datetime
    unread_count: int
    last_message: Optional[str] = None

    class Config:
        from_attributes = True


class AdminReplyMessage(BaseModel):
    message: str
    conversation_id: str
    reply_to_id: Optional[int] = None


# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_connections: Dict[int, WebSocket] = {}
        self.admin_connections: Dict[int, WebSocket] = {}

    async def connect_user(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.user_connections[user_id] = websocket

    async def connect_admin(self, websocket: WebSocket, admin_id: int):
        await websocket.accept()
        self.admin_connections[admin_id] = websocket

    def disconnect_user(self, user_id: int):
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    def disconnect_admin(self, admin_id: int):
        if admin_id in self.admin_connections:
            del self.admin_connections[admin_id]

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_text(json.dumps(message))
            except Exception:
                self.disconnect_user(user_id)

    async def send_to_all_admins(self, message: dict):
        disconnected = []
        for admin_id, websocket in self.admin_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                disconnected.append(admin_id)

        for admin_id in disconnected:
            self.disconnect_admin(admin_id)

    async def send_to_conversation(self, conversation_id: str, message: dict):
        # Send to all participants in a conversation
        await self.send_to_all_admins(message)


manager = ConnectionManager()


# Helper Functions
def create_conversation(
    db: Session, user_id: int, subject: str = "Support-Anfrage"
) -> str:
    """Create a new conversation and return its ID"""
    conversation_id = str(uuid.uuid4())
    conversation = ChatConversation(
        id=conversation_id, user_id=user_id, subject=subject
    )
    db.add(conversation)
    db.commit()
    return conversation_id


def get_or_create_conversation(
    db: Session, user_id: int, conversation_id: Optional[str] = None
) -> str:
    """Get existing conversation or create new one"""
    if conversation_id:
        # Check if conversation exists and belongs to user
        conv = (
            db.query(ChatConversation)
            .filter(
                and_(
                    ChatConversation.id == conversation_id,
                    ChatConversation.user_id == user_id,
                )
            )
            .first()
        )
        if conv:
            return conversation_id

    # Look for existing open conversation for this user
    existing_conv = (
        db.query(ChatConversation)
        .filter(
            and_(ChatConversation.user_id == user_id, ChatConversation.status == "open")
        )
        .order_by(desc(ChatConversation.last_message_at))
        .first()
    )

    if existing_conv:
        return existing_conv.id

    # Create new conversation only if no open conversation exists
    return create_conversation(db, user_id)


# REST Endpoints


@router.get("/conversations", response_model=List[ConversationResponse])
def get_user_conversations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """Get all conversations for the current user"""
    conversations = (
        db.query(ChatConversation)
        .filter(ChatConversation.user_id == current_user.id)
        .order_by(desc(ChatConversation.last_message_at))
        .all()
    )

    result = []
    for conv in conversations:
        # Get unread message count
        unread_count = (
            db.query(ChatMessage)
            .filter(
                and_(
                    ChatMessage.conversation_id == conv.id,
                    ChatMessage.sender_type != MessageType.USER,
                    ChatMessage.is_read.is_(False),
                )
            )
            .count()
        )

        # Get last message
        last_message = (
            db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conv.id)
            .order_by(desc(ChatMessage.created_at))
            .first()
        )

        result.append(
            ConversationResponse(
                id=conv.id,
                user_id=conv.user_id,
                user_name=f"{current_user.vorname} {current_user.nachname}",
                subject=conv.subject,
                status=conv.status,
                priority=conv.priority,
                last_message_at=conv.last_message_at,
                unread_count=unread_count,
                last_message=(
                    last_message.message[:50] + "..."
                    if last_message and len(last_message.message) > 50
                    else last_message.message if last_message else None
                ),
            )
        )

    return result


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=List[ChatMessageResponse],
)
def get_conversation_messages(
    conversation_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get messages for a specific conversation"""
    # Verify user owns this conversation
    conversation = (
        db.query(ChatConversation)
        .filter(
            and_(
                ChatConversation.id == conversation_id,
                ChatConversation.user_id == current_user.id,
            )
        )
        .first()
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Mark admin messages as read
    db.query(ChatMessage).filter(
        and_(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.sender_type != MessageType.USER,
            ChatMessage.is_read.is_(False),
        )
    ).update({ChatMessage.is_read: True})
    db.commit()

    return [
        ChatMessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_type=msg.sender_type.value,
            sender_name=msg.sender_name,
            message=msg.message,
            is_read=msg.is_read,
            reply_to_id=msg.reply_to_id,
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.post("/messages", response_model=ChatMessageResponse)
def send_message(
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a new message"""
    conversation_id = get_or_create_conversation(
        db, current_user.id, message_data.conversation_id
    )

    sender_name = f"{current_user.vorname} {current_user.nachname}"

    new_message = ChatMessage(
        conversation_id=conversation_id,
        user_id=current_user.id,
        sender_type=MessageType.USER,
        sender_id=current_user.id,
        sender_name=sender_name,
        message=message_data.message,
        reply_to_id=message_data.reply_to_id,
    )

    db.add(new_message)

    # Update conversation last_message_at
    db.query(ChatConversation).filter(ChatConversation.id == conversation_id).update(
        {ChatConversation.last_message_at: datetime.utcnow()}
    )

    db.commit()
    db.refresh(new_message)

    # Send to admins via WebSocket
    message_dict = {
        "type": "new_message",
        "data": {
            "id": new_message.id,
            "conversation_id": conversation_id,
            "sender_type": "user",
            "sender_name": sender_name,
            "user_id": current_user.id,
            "message": message_data.message,
            "created_at": new_message.created_at.isoformat(),
        },
    }

    # Send to all admins
    import asyncio

    try:
        asyncio.create_task(manager.send_to_all_admins(message_dict))
    except Exception:
        # WebSocket might not be available
        pass

    # Send push notification to all admins
    try:
        from routers.push_notifications import send_chat_notification

        # Get all admin users
        admin_users = db.query(User).filter(User.is_admin.is_(True)).all()
        for admin in admin_users:
            if admin.id != current_user.id:  # Don't send to self
                send_chat_notification(
                    admin.id, sender_name, message_data.message, conversation_id
                )
    except Exception as e:
        print(f"Error sending push notification: {e}")

    return ChatMessageResponse(
        id=new_message.id,
        conversation_id=new_message.conversation_id,
        sender_type=new_message.sender_type.value,
        sender_name=new_message.sender_name,
        message=new_message.message,
        is_read=new_message.is_read,
        reply_to_id=new_message.reply_to_id,
        created_at=new_message.created_at,
    )


# Admin Endpoints
@router.get("/admin/conversations", response_model=List[ConversationResponse])
def get_all_conversations(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Get all conversations"""
    query = db.query(ChatConversation)

    if status:
        query = query.filter(ChatConversation.status == status)
    if priority:
        query = query.filter(ChatConversation.priority == priority)

    conversations = (
        query.order_by(desc(ChatConversation.last_message_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for conv in conversations:
        # Get user info
        user = db.query(User).filter(User.id == conv.user_id).first()

        # Get unread message count
        unread_count = (
            db.query(ChatMessage)
            .filter(
                and_(
                    ChatMessage.conversation_id == conv.id,
                    ChatMessage.sender_type == MessageType.USER,
                    ChatMessage.is_read.is_(False),
                )
            )
            .count()
        )

        # Get last message
        last_message = (
            db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conv.id)
            .order_by(desc(ChatMessage.created_at))
            .first()
        )

        result.append(
            ConversationResponse(
                id=conv.id,
                user_id=conv.user_id,
                user_name=f"{user.vorname} {user.nachname}" if user else "Unknown User",
                subject=conv.subject,
                status=conv.status,
                priority=conv.priority,
                last_message_at=conv.last_message_at,
                unread_count=unread_count,
                last_message=(
                    last_message.message[:50] + "..."
                    if last_message and len(last_message.message) > 50
                    else last_message.message if last_message else None
                ),
            )
        )

    return result


@router.get(
    "/admin/conversations/{conversation_id}/messages",
    response_model=List[ChatMessageResponse],
)
def admin_get_conversation_messages(
    conversation_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Get messages for a specific conversation"""
    # Verify conversation exists
    conversation = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conversation_id)
        .first()
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        ChatMessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_type=msg.sender_type.value,
            sender_name=msg.sender_name,
            message=msg.message,
            is_read=msg.is_read,
            reply_to_id=msg.reply_to_id,
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.post("/admin/conversations/{conversation_id}/mark-read")
def admin_mark_conversation_read(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Mark all user messages in a conversation as read"""
    # Verify conversation exists
    conversation = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conversation_id)
        .first()
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Mark all user messages as read
    db.query(ChatMessage).filter(
        and_(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.sender_type == MessageType.USER,
            ChatMessage.is_read.is_(False),
        )
    ).update({ChatMessage.is_read: True})

    db.commit()

    return {"message": "Conversation marked as read"}


@router.delete("/admin/conversations/{conversation_id}")
def admin_delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Delete a conversation and all its messages"""
    # Verify conversation exists
    conversation = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conversation_id)
        .first()
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete all messages first
    db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).delete()

    # Delete the conversation
    db.delete(conversation)
    db.commit()

    return {"message": "Conversation deleted successfully"}


@router.post("/admin/reply", response_model=ChatMessageResponse)
def admin_reply(
    reply_data: AdminReplyMessage,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Reply to a user message"""
    # Verify conversation exists
    conversation = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == reply_data.conversation_id)
        .first()
    )

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    admin_name = f"Support ({current_admin.vorname} {current_admin.nachname})"

    reply_message = ChatMessage(
        conversation_id=reply_data.conversation_id,
        user_id=conversation.user_id,
        sender_type=MessageType.ADMIN,
        sender_id=current_admin.id,
        sender_name=admin_name,
        message=reply_data.message,
        reply_to_id=reply_data.reply_to_id,
    )

    db.add(reply_message)

    # Update conversation
    db.query(ChatConversation).filter(
        ChatConversation.id == reply_data.conversation_id
    ).update(
        {
            ChatConversation.last_message_at: datetime.utcnow(),
            ChatConversation.assigned_admin_id: current_admin.id,
        }
    )

    db.commit()
    db.refresh(reply_message)

    # Send to user via WebSocket
    message_dict = {
        "type": "admin_reply",
        "data": {
            "id": reply_message.id,
            "conversation_id": reply_data.conversation_id,
            "sender_type": "admin",
            "sender_name": admin_name,
            "message": reply_data.message,
            "created_at": reply_message.created_at.isoformat(),
        },
    }

    # Send to user
    import asyncio

    try:
        asyncio.create_task(manager.send_to_user(conversation.user_id, message_dict))
    except Exception:
        pass

    # Send push notification to user
    try:
        from routers.push_notifications import send_chat_notification

        send_chat_notification(
            conversation.user_id,
            admin_name,
            reply_data.message,
            reply_data.conversation_id,
        )
    except Exception as e:
        print(f"Error sending push notification: {e}")

    return ChatMessageResponse(
        id=reply_message.id,
        conversation_id=reply_message.conversation_id,
        sender_type=reply_message.sender_type.value,
        sender_name=reply_message.sender_name,
        message=reply_message.message,
        is_read=reply_message.is_read,
        reply_to_id=reply_message.reply_to_id,
        created_at=reply_message.created_at,
    )


# Notification Endpoints
@router.get("/notifications/count")
def get_notification_count(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """Get notification count for the current user"""
    if current_user.is_admin:
        # Admin: Count conversations with unread messages from users
        unread_conversations = (
            db.query(ChatMessage.conversation_id)
            .filter(
                and_(
                    ChatMessage.sender_type == MessageType.USER,
                    ChatMessage.is_read.is_(False),
                )
            )
            .distinct()
            .count()
        )
        return {"count": unread_conversations}
    else:
        # User: Return 1 if any unread messages from admin exist, otherwise 0
        unread_exists = (
            db.query(ChatMessage)
            .filter(
                and_(
                    ChatMessage.user_id == current_user.id,
                    ChatMessage.sender_type == MessageType.ADMIN,
                    ChatMessage.is_read.is_(False),
                )
            )
            .first()
        )
        return {"count": 1 if unread_exists else 0}


@router.get("/notifications/admin/count")
def get_admin_notification_count(
    db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)
):
    """Admin: Get detailed notification count"""
    # Count all unread messages from users
    unread_count = (
        db.query(ChatMessage)
        .filter(
            and_(
                ChatMessage.sender_type == MessageType.USER,
                ChatMessage.is_read.is_(False),
            )
        )
        .count()
    )

    # Count unique conversations with unread messages
    unread_conversations = (
        db.query(ChatMessage.conversation_id)
        .filter(
            and_(
                ChatMessage.sender_type == MessageType.USER,
                ChatMessage.is_read.is_(False),
            )
        )
        .distinct()
        .count()
    )

    return {"count": unread_count, "unread_conversations": unread_conversations}


@router.get("/notifications/user/count")
def get_user_notification_count(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """User: Get notification count (1 if any unread admin messages exist)"""
    unread_exists = (
        db.query(ChatMessage)
        .filter(
            and_(
                ChatMessage.user_id == current_user.id,
                ChatMessage.sender_type == MessageType.ADMIN,
                ChatMessage.is_read.is_(False),
            )
        )
        .first()
    )

    return {"count": 1 if unread_exists else 0}


# WebSocket Endpoints
@router.websocket("/ws/{user_id}")
async def websocket_endpoint_user(
    websocket: WebSocket, user_id: int, db: Session = Depends(get_db)
):
    """WebSocket endpoint for users"""
    await manager.connect_user(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
            # Handle incoming messages if needed
            # For now, just keep connection alive
    except WebSocketDisconnect:
        manager.disconnect_user(user_id)


@router.websocket("/ws/admin/{admin_id}")
async def websocket_endpoint_admin(
    websocket: WebSocket, admin_id: int, db: Session = Depends(get_db)
):
    """WebSocket endpoint for admins"""
    await manager.connect_admin(websocket, admin_id)
    try:
        while True:
            await websocket.receive_text()
            # Handle incoming admin messages if needed
    except WebSocketDisconnect:
        manager.disconnect_admin(admin_id)
