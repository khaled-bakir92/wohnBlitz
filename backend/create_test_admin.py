#!/usr/bin/env python3
import sqlite3
from core.security import get_password_hash

def create_test_admin():
    """Create a test admin user with a known password"""
    try:
        # Connect to database
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        
        # Create test admin with known password
        email = "admin@test.com"
        password = "admin123"
        hashed_password = get_password_hash(password)
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing user to be admin
            cursor.execute("""
                UPDATE users 
                SET hashed_password = ?, is_admin = 1, is_active = 1 
                WHERE email = ?
            """, (hashed_password, email))
            print(f"Updated existing user {email} to admin with password: {password}")
        else:
            # Create new admin user
            cursor.execute("""
                INSERT INTO users (email, vorname, nachname, hashed_password, is_admin, is_active, created_at)
                VALUES (?, ?, ?, ?, 1, 1, datetime('now'))
            """, (email, "Test", "Admin", hashed_password))
            print(f"Created new admin user {email} with password: {password}")
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_test_admin()