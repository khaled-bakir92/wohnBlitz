#!/usr/bin/env python3
import sqlite3
from core.security import get_password_hash

def reset_admin_passwords():
    """Reset passwords for all admin users to known values"""
    try:
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        
        # Get all admin users
        cursor.execute("SELECT email, id FROM users WHERE is_admin = 1")
        admin_users = cursor.fetchall()
        
        print("Resetting passwords for admin users:")
        
        # Reset passwords
        admin_passwords = {
            "admin@test.com": "admin123",
            "test@example.com": "test123", 
            "khaled@gmail.com": "khaled123"
        }
        
        for email, user_id in admin_users:
            password = admin_passwords.get(email, "admin123")  # Default password
            hashed_password = get_password_hash(password)
            
            cursor.execute(
                "UPDATE users SET hashed_password = ? WHERE id = ?", 
                (hashed_password, user_id)
            )
            
            print(f"✅ {email} -> Password: {password}")
        
        conn.commit()
        conn.close()
        
        print("\n🎯 You can now login with:")
        print("   Email: khaled@gmail.com")
        print("   Password: khaled123")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_admin_passwords()