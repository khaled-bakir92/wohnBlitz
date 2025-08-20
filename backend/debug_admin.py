#!/usr/bin/env python3
import json

import requests

# API base URL
API_BASE = "http://localhost:8000"


def full_admin_debug():
    """Complete debug of admin authentication flow"""

    print("=== DEBUGGING ADMIN AUTHENTICATION ===\n")

    # 1. Test login with khaled@gmail.com
    login_data = {
        "email": "khaled@gmail.com",
        "password": "khaled123",  # Updated password
    }

    print("1. Testing login with khaled@gmail.com...")
    login_response = requests.post(f"{API_BASE}/api/login", json=login_data)
    print(f"Login status: {login_response.status_code}")

    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        # Try with common passwords
        for pwd in ["password", "123456", "admin", "khaled123", ""]:
            print(f"Trying password: '{pwd}'")
            login_data["password"] = pwd
            resp = requests.post(f"{API_BASE}/api/login", json=login_data)
            if resp.status_code == 200:
                print(f"SUCCESS with password: '{pwd}'")
                login_response = resp
                break
        else:
            print("❌ Could not find correct password")
            return

    # 2. Analyze token response
    token_data = login_response.json()
    print("\n2. Token response:")
    print(f"   Access Token: {token_data['access_token'][:50]}...")
    print(f"   Token Type: {token_data['token_type']}")
    print(f"   Is Admin (from login): {token_data.get('is_admin', 'NOT PRESENT')}")

    access_token = token_data["access_token"]

    # 3. Test /api/me endpoint
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    print("\n3. Testing /api/me endpoint...")
    me_response = requests.get(f"{API_BASE}/api/me", headers=headers)
    print(f"   Status: {me_response.status_code}")

    if me_response.status_code == 200:
        user_data = me_response.json()
        print(f"   User data: {json.dumps(user_data, indent=2)}")
        print(f"   Is Admin (from /api/me): {user_data.get('is_admin', 'NOT PRESENT')}")
    else:
        print(f"   Error: {me_response.text}")

    # 4. Test /api/users endpoint (admin required)
    print("\n4. Testing /api/users endpoint...")
    users_response = requests.get(f"{API_BASE}/api/users", headers=headers)
    print(f"   Status: {users_response.status_code}")

    if users_response.status_code == 200:
        users = users_response.json()
        print(f"   ✅ SUCCESS: Got {len(users)} users (admin access confirmed)")
    else:
        print(f"   ❌ FAILED: {users_response.text}")

    # 5. Decode JWT token manually (base64)
    print("\n5. Decoding JWT token payload...")
    try:
        import base64

        # JWT format: header.payload.signature
        token_parts = access_token.split(".")
        if len(token_parts) >= 2:
            payload_encoded = token_parts[1]
            # Add padding if needed
            payload_encoded += "=" * (-len(payload_encoded) % 4)
            payload_decoded = base64.urlsafe_b64decode(payload_encoded)
            payload_json = json.loads(payload_decoded)
            print(f"   JWT Payload: {json.dumps(payload_json, indent=2)}")
        else:
            print("   ❌ Invalid JWT format")
    except Exception as e:
        print(f"   ❌ JWT decode error: {e}")


if __name__ == "__main__":
    full_admin_debug()
