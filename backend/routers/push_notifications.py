from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.database import get_db
from models.user import User
from core.auth import get_current_active_user
import requests
import json

router = APIRouter(prefix="/api/push", tags=["push_notifications"])


class PushTokenRegistration(BaseModel):
    token: str
    platform: str  # 'ios' or 'android'
    device_type: str = 'expo'  # 'expo' or 'fcm'


class PushNotificationPayload(BaseModel):
    title: str
    body: str
    data: Optional[dict] = None
    user_ids: Optional[list[int]] = None  # If None, send to all users


# In-memory storage for push tokens (in production, use a proper database)
push_tokens = {}


@router.post("/register")
def register_push_token(
    token_data: PushTokenRegistration,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Register a push token for the current user"""
    user_id = current_user.id
    
    # Store token in memory (in production, store in database)
    push_tokens[user_id] = {
        'token': token_data.token,
        'platform': token_data.platform,
        'device_type': token_data.device_type,
        'user_email': current_user.email
    }
    
    return {
        "message": "Push token registered successfully",
        "user_id": user_id,
        "platform": token_data.platform
    }


@router.post("/send")
def send_push_notification(
    notification: PushNotificationPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a push notification (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Determine target users
    target_users = notification.user_ids or list(push_tokens.keys())
    
    sent_count = 0
    failed_count = 0
    
    for user_id in target_users:
        if user_id in push_tokens:
            token_info = push_tokens[user_id]
            
            # Send notification via Expo Push API
            success = send_expo_notification(
                token_info['token'],
                notification.title,
                notification.body,
                notification.data
            )
            
            if success:
                sent_count += 1
            else:
                failed_count += 1
    
    return {
        "message": f"Push notifications sent to {sent_count} users, {failed_count} failed",
        "sent_count": sent_count,
        "failed_count": failed_count
    }


@router.get("/tokens")
def get_registered_tokens(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all registered push tokens (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "tokens": push_tokens,
        "total_count": len(push_tokens)
    }


@router.delete("/unregister")
def unregister_push_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Unregister push token for current user"""
    user_id = current_user.id
    
    if user_id in push_tokens:
        del push_tokens[user_id]
        return {"message": "Push token unregistered successfully"}
    
    return {"message": "No push token found for user"}


def send_expo_notification(token: str, title: str, body: str, data: dict = None) -> bool:
    """Send a push notification via Expo Push API"""
    try:
        payload = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {}
        }
        
        response = requests.post(
            "https://exp.host/--/api/v2/push/send",
            headers={
                "Accept": "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json"
            },
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("data", {}).get("status") == "ok":
                return True
            else:
                print(f"Expo push notification failed: {result}")
                return False
        else:
            print(f"Expo push API error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"Error sending push notification: {e}")
        return False


def send_chat_notification(user_id: int, sender_name: str, message: str, conversation_id: str):
    """Send a chat notification to a specific user"""
    if user_id in push_tokens:
        token_info = push_tokens[user_id]
        
        title = f"Neue Nachricht von {sender_name}"
        body = message[:100] + "..." if len(message) > 100 else message
        
        data = {
            "type": "chat_message",
            "conversation_id": conversation_id,
            "sender_name": sender_name,
            "url": f"/user/chat/{conversation_id}",  # Deep link URL
            "deep_link": f"wohnblitzer://chat/{conversation_id}"  # Custom scheme
        }
        
        return send_expo_notification(token_info['token'], title, body, data)
    
    return False


def send_apartment_notification(user_id: int, apartment_title: str, apartment_id: str):
    """Send an apartment found notification to a specific user"""
    if user_id in push_tokens:
        token_info = push_tokens[user_id]
        
        title = "Neue Wohnung gefunden!"
        body = f"Eine passende Wohnung wurde gefunden: {apartment_title}"
        
        data = {
            "type": "apartment_found",
            "apartment_id": apartment_id,
            "url": f"/user/apartment/{apartment_id}",  # Deep link URL
            "deep_link": f"wohnblitzer://apartment/{apartment_id}"  # Custom scheme
        }
        
        return send_expo_notification(token_info['token'], title, body, data)
    
    return False