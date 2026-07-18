"""
Database configuration and SQLAlchemy models for FinTrack.
"""
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Date, DateTime,
    Boolean, Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
import enum
import os

DB_PATH = os.getenv("FINTRACK_DB", os.path.join(os.path.dirname(__file__), "../../finance.db"))
DATABASE_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Enums ────────────────────────────────────────────────────────────────────

class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"
    transfer = "transfer"

class AccountType(str, enum.Enum):
    savings = "savings"
    current = "current"
    wallet = "wallet"
    credit = "credit"

class WishlistPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class BillingCycle(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"
    weekly = "weekly"

class SubscriptionStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"

class DebtDirection(str, enum.Enum):
    owed_to_me = "owed_to_me"
    i_owe = "i_owe"

class DebtStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"


# ─── Models ───────────────────────────────────────────────────────────────────

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), default="tag")
    color = Column(String(20), default="#00D09C")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="category_rel")


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    bank_name = Column(String(200))
    account_type = Column(SAEnum(AccountType), default=AccountType.savings)
    current_balance = Column(Float, default=0.0)
    minimum_balance = Column(Float, default=0.0)
    image_url = Column(Text)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="account_rel", foreign_keys="[Transaction.account_id]")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(SAEnum(TransactionType), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = Column(String(100))          # denormalised fallback
    subcategory = Column(String(100))
    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)
    account = Column(String(200))           # denormalised fallback
    to_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)
    to_account = Column(String(200))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category_rel = relationship("Category", back_populates="transactions")
    account_rel = relationship("BankAccount", back_populates="transactions", foreign_keys=[account_id])


class WishlistItem(Base):
    __tablename__ = "wishlist"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), nullable=False)
    price = Column(Float)
    product_url = Column(Text)
    image_url = Column(Text)
    category = Column(String(100))
    priority = Column(SAEnum(WishlistPriority), default=WishlistPriority.medium)
    notes = Column(Text)
    purchased = Column(Boolean, default=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())


class StockInvestment(Base):
    __tablename__ = "stock_investments"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(200))
    instrument_name = Column(String(300), nullable=False)
    amount_invested = Column(Float, nullable=False)
    units = Column(Float)
    date_invested = Column(Date)
    current_value = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    billing_cycle = Column(SAEnum(BillingCycle), default=BillingCycle.monthly)
    next_billing_date = Column(Date)
    category = Column(String(100))
    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)
    image_url = Column(Text)
    status = Column(SAEnum(SubscriptionStatus), default=SubscriptionStatus.active)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    account_rel = relationship("BankAccount")


class Debt(Base):
    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, index=True)
    person_name = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    direction = Column(SAEnum(DebtDirection), nullable=False)
    date_created = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)
    note = Column(Text)
    status = Column(SAEnum(DebtStatus), default=DebtStatus.pending)
    paid_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account_rel = relationship("BankAccount")


def init_db():
    """Create all tables and seed default data."""
    Base.metadata.create_all(bind=engine)
    _seed_defaults()


def _seed_defaults():
    db = SessionLocal()
    try:
        # Seed categories
        if db.query(Category).count() == 0:
            default_categories = [
                {"name": "Food & Dining",    "icon": "utensils",      "color": "#F97316"},
                {"name": "Rent & Housing",   "icon": "home",          "color": "#8B5CF6"},
                {"name": "Transport",        "icon": "car",           "color": "#3B82F6"},
                {"name": "Shopping",         "icon": "shopping-bag",  "color": "#EC4899"},
                {"name": "Bills & Utilities","icon": "zap",           "color": "#EAB308"},
                {"name": "Entertainment",    "icon": "film",          "color": "#06B6D4"},
                {"name": "Health",           "icon": "heart",         "color": "#EF4444"},
                {"name": "Investments",      "icon": "trending-up",   "color": "#00D09C"},
                {"name": "Education",        "icon": "book-open",     "color": "#6366F1"},
                {"name": "Misc",             "icon": "more-horizontal","color": "#6B7280"},
                {"name": "Income",           "icon": "dollar-sign",   "color": "#10B981"},
                {"name": "Salary",           "icon": "briefcase",     "color": "#14B8A6"},
            ]
            for cat in default_categories:
                db.add(Category(**cat))

        # Seed default settings
        defaults = {
            "ollama_url": "http://localhost:11434",
            "ollama_model": "llama3",
            "currency": "INR",
            "currency_symbol": "₹",
            "default_account_id": "",
            "twelvedata_api_key": "",
        }
        for k, v in defaults.items():
            if not db.query(Settings).filter_by(key=k).first():
                db.add(Settings(key=k, value=v))

        db.commit()
    finally:
        db.close()
