#!/usr/bin/env python3

import requests
import json

# API Configuration
BASE_URL = "http://localhost:8000"

def get_admin_token():
    """Get admin access token"""
    login_data = {
        "username": "admin@test.com",
        "password": "admin123"
    }
    
    response = requests.post(f"{BASE_URL}/api/token", data=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_notification_endpoints():
    """Test all notification-related endpoints"""
    token = get_admin_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=== Testing Notification Endpoints ===\n")
    
    # Test notification count
    print("1. Testing /api/chat/notifications/count")
    response = requests.get(f"{BASE_URL}/api/chat/notifications/count", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data}")
    else:
        print(f"Error: {response.text}")
    print()
    
    # Test conversations
    print("2. Testing /api/chat/conversations")
    response = requests.get(f"{BASE_URL}/api/chat/conversations", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Conversations: {len(data)} found")
        for i, conv in enumerate(data[:3]):  # Show first 3
            print(f"  Conv {i+1}: ID={conv['id'][:8]}..., unread={conv['unread_count']}, last_message='{conv.get('last_message', 'None')}'")
    else:
        print(f"Error: {response.text}")
    print()
    
    # Test admin conversations
    print("3. Testing /api/chat/admin/conversations")
    response = requests.get(f"{BASE_URL}/api/chat/admin/conversations", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Admin conversations: {len(data)} found")
        for i, conv in enumerate(data[:3]):  # Show first 3
            print(f"  Conv {i+1}: ID={conv['id'][:8]}..., unread={conv['unread_count']}, user={conv['user_name']}")
    else:
        print(f"Error: {response.text}")
    print()
    
    # Test admin notification count
    print("4. Testing /api/chat/notifications/admin/count")
    response = requests.get(f"{BASE_URL}/api/chat/notifications/admin/count", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Admin count: {data}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_notification_endpoints()