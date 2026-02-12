import sqlite3
import os

DB_PATH = 'backend/data/fab.sqlite'

def cleanup():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    user_to_delete = "growth_test_user_v1"
    
    # Get User ID
    c.execute("SELECT id FROM users WHERE username = ?", (user_to_delete,))
    user = c.fetchone()
    
    if user:
        user_id = user[0]
        print(f"Found user {user_to_delete} (ID: {user_id}). Deleting...")
        
        # Delete related data
        c.execute("DELETE FROM skills WHERE user_id = ?", (user_id,))
        c.execute("DELETE FROM growth_history WHERE user_id = ?", (user_id,))
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
        
        conn.commit()
        print("✅ User and related data deleted.")
    else:
        print(f"User {user_to_delete} not found.")

    conn.close()

if __name__ == "__main__":
    cleanup()
