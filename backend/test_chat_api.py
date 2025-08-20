#!/usr/bin/env python3
"""Test script for chat API endpoints"""


import requests


# Test admin login and chat API
def test_chat_api():
    base_url = "http://localhost:8000"

    # First, login as admin
    login_data = {"username": "khaled@gmail.com", "password": "123456"}

    print("1. Testing admin login...")
    login_response = requests.post(f"{base_url}/api/auth/login", data=login_data)

    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return

    token_data = login_response.json()
    access_token = token_data["access_token"]
    print(f"✓ Login successful, token: {access_token[:20]}...")

    # Test admin conversations endpoint
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    print("\n2. Testing admin conversations endpoint...")
    conv_response = requests.get(
        f"{base_url}/api/chat/admin/conversations", headers=headers
    )

    if conv_response.status_code != 200:
        print(f"Conversations request failed: {conv_response.status_code}")
        print(f"Response: {conv_response.text}")
        return

    conversations = conv_response.json()
    print(f"✓ Got {len(conversations)} conversations")

    for conv in conversations:
        print(
            f"  - {
                conv['id']}: {
                conv['subject']} (User: {
                conv['user_name']}, Unread: {
                conv['unread_count']})"
        )

    # Test messages endpoint for first conversation
    if conversations:
        first_conv = conversations[0]
        print(f"\n3. Testing messages for conversation {first_conv['id']}...")

        messages_response = requests.get(
            f"{base_url}/api/chat/conversations/{first_conv['id']}/messages",
            headers=headers,
        )

        if messages_response.status_code != 200:
            print(f"Messages request failed: {messages_response.status_code}")
            print(f"Response: {messages_response.text}")
            return

        messages = messages_response.json()
        print(f"✓ Got {len(messages)} messages")

        for msg in messages:
            print(
                f"  - {msg['sender_type']}: {msg['message'][:50]}... ({msg['created_at']})"
            )

    print("\n✓ All API tests passed!")


if __name__ == "__main__":
    test_chat_api()
