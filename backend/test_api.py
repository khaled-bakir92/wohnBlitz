#!/usr/bin/env python3

import requests

# API base URL
API_BASE = "http://localhost:8000"


def test_login_and_user_creation():
    """Test admin login and user creation"""

    # Login as admin
    login_data = {"email": "admin@test.com", "password": "admin123"}

    print("1. Attempting admin login...")
    login_response = requests.post(f"{API_BASE}/api/login", json=login_data)
    print(f"Login response: {login_response.status_code}")

    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        # Try with different password
        login_data["password"] = "password"
        login_response = requests.post(f"{API_BASE}/api/login", json=login_data)
        print(f"Login retry response: {login_response.status_code}")

        if login_response.status_code != 200:
            print(f"Login retry failed: {login_response.text}")
            return

    token_data = login_response.json()
    access_token = token_data["access_token"]
    print(f"Got access token: {access_token[:20]}...")
    print(f"Is admin: {token_data.get('is_admin', False)}")

    # Test creating a new user
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    print("\n2. Testing get users...")
    users_response = requests.get(f"{API_BASE}/api/users", headers=headers)
    print(f"Get users response: {users_response.status_code}")
    if users_response.status_code == 200:
        users = users_response.json()
        print(f"Found {len(users)} users")
    else:
        print(f"Get users failed: {users_response.text}")

    print("\n3. Testing user creation...")
    import time

    user_data = {"email": f"newuser{int(time.time())}@example.com"}
    create_response = requests.post(
        f"{API_BASE}/api/users/create-with-email", json=user_data, headers=headers
    )

    print(f"User creation response: {create_response.status_code}")
    if create_response.status_code == 200:
        result = create_response.json()
        print(f"Success! Generated password: {result['generated_password']}")
        print(f"User created: {result['user']['email']}")
    else:
        print(f"User creation failed: {create_response.text}")
        try:
            error_detail = create_response.json()
            print(f"Error detail: {error_detail}")
        except BaseException:
            pass


if __name__ == "__main__":
    test_login_and_user_creation()
