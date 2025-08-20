#!/usr/bin/env python3
import sqlite3
import sys


def make_user_admin(email=None):
    """Make a user admin by email, or the first user if no email provided"""
    try:
        # Connect to the database
        conn = sqlite3.connect("app.db")
        cursor = conn.cursor()

        # Check current users
        cursor.execute("SELECT id, email, is_admin FROM users")
        users = cursor.fetchall()

        print("Current users:")
        for user in users:
            print(f"ID: {user[0]}, Email: {user[1]}, Admin: {bool(user[2])}")

        if not users:
            print("No users found in database")
            return

        # Determine which user to make admin
        if email:
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            user = cursor.fetchone()
            if not user:
                print(f"User with email {email} not found")
                return
            user_id = user[0]
        else:
            user_id = users[0][0]  # First user
            email = users[0][1]

        # Update user to admin
        cursor.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (user_id,))
        conn.commit()

        print(f"\nSuccessfully made user {email} an admin!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else None
    make_user_admin(email)
