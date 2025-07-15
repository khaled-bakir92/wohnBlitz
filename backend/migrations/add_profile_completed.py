"""
Migration: Add profile_completed field to users table

This migration adds a profile_completed boolean field to track whether 
users have completed their profile setup on first login.
"""

import sqlite3
import os

def get_db_path():
    """Get the database path relative to the backend directory"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    return os.path.join(backend_dir, 'app.db')

def migrate():
    """Add profile_completed column to users table"""
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'profile_completed' not in columns:
            # Add the profile_completed column
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE
            """)
            
            print("Added profile_completed column to users table")
        else:
            print("profile_completed column already exists")
        
        conn.commit()
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def rollback():
    """Remove profile_completed column from users table"""
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # SQLite doesn't support DROP COLUMN directly
        # We need to recreate the table without the column
        
        # Get current table schema
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
        create_table_sql = cursor.fetchone()[0]
        
        if 'profile_completed' in create_table_sql:
            # Create a temporary table without profile_completed
            cursor.execute("""
                CREATE TABLE users_temp AS 
                SELECT id, vorname, nachname, email, hashed_password, is_admin, is_active, 
                       filter_einstellungen, bewerbungsprofil, created_at, updated_at
                FROM users
            """)
            
            # Drop the original table
            cursor.execute("DROP TABLE users")
            
            # Recreate the users table without profile_completed
            cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    vorname VARCHAR(50) NOT NULL,
                    nachname VARCHAR(50) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    is_admin BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE,
                    filter_einstellungen TEXT,
                    bewerbungsprofil TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME
                )
            """)
            
            # Copy data back
            cursor.execute("""
                INSERT INTO users (id, vorname, nachname, email, hashed_password, is_admin, is_active,
                                 filter_einstellungen, bewerbungsprofil, created_at, updated_at)
                SELECT id, vorname, nachname, email, hashed_password, is_admin, is_active,
                       filter_einstellungen, bewerbungsprofil, created_at, updated_at
                FROM users_temp
            """)
            
            # Drop temporary table
            cursor.execute("DROP TABLE users_temp")
            
            print("Removed profile_completed column from users table")
        else:
            print("profile_completed column doesn't exist")
        
        conn.commit()
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        print("Rolling back migration...")
        success = rollback()
    else:
        print("Running migration...")
        success = migrate()
    
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        sys.exit(1)