import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'finance.db')

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    tables = [
        "categories", "bank_accounts", "transactions", "wishlist",
        "stock_investments", "settings", "subscriptions", "debts",
        "mutual_funds", "mutual_fund_transactions"
    ]

    for table in tables:
        try:
            print(f"Adding user_id to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id VARCHAR(50) DEFAULT 'Aneesh' NOT NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column user_id already exists in {table}.")
            else:
                print(f"Error altering {table}: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
