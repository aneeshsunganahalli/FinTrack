import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "../../finance.db")
print(f"Migrating database at: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Add linked_transaction_id to debts
try:
    cursor.execute("ALTER TABLE debts ADD COLUMN linked_transaction_id INTEGER REFERENCES transactions(id)")
    print("Added linked_transaction_id to debts table.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column linked_transaction_id already exists in debts table.")
    else:
        print(f"Error adding column: {e}")

# 2. Add Bank Charges category
cursor.execute("SELECT id FROM categories WHERE name = 'Bank Charges'")
if not cursor.fetchone():
    cursor.execute(
        "INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)",
        ("Bank Charges", "credit-card", "#F43F5E")
    )
    print("Added Bank Charges category.")
else:
    print("Bank Charges category already exists.")

conn.commit()
conn.close()
print("Migration completed successfully.")
