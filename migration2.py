import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'finance.db')

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Recreate categories table
    cursor.execute("""
        CREATE TABLE categories_new (
            id INTEGER NOT NULL PRIMARY KEY,
            user_id VARCHAR(50) DEFAULT 'Aneesh' NOT NULL,
            name VARCHAR(100) NOT NULL,
            icon VARCHAR(50),
            color VARCHAR(20),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("INSERT INTO categories_new SELECT id, user_id, name, icon, color, created_at FROM categories")
    cursor.execute("DROP TABLE categories")
    cursor.execute("ALTER TABLE categories_new RENAME TO categories")
    
    # Recreate settings table
    cursor.execute("""
        CREATE TABLE settings_new (
            id INTEGER NOT NULL PRIMARY KEY,
            user_id VARCHAR(50) DEFAULT 'Aneesh' NOT NULL,
            key VARCHAR(100) NOT NULL,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("INSERT INTO settings_new SELECT id, user_id, key, value, updated_at FROM settings")
    cursor.execute("DROP TABLE settings")
    cursor.execute("ALTER TABLE settings_new RENAME TO settings")

    conn.commit()
    conn.close()
    print("Migration 2 complete.")

if __name__ == "__main__":
    migrate()
