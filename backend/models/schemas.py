"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import date, datetime
from backend.models.database import TransactionType, AccountType, WishlistPriority, BillingCycle, SubscriptionStatus, DebtDirection, DebtStatus


# ─── Category Schemas ─────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "tag"
    color: Optional[str] = "#00D09C"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryOut(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    class Config:
        from_attributes = True


# ─── Bank Account Schemas ─────────────────────────────────────────────────────

class BankAccountCreate(BaseModel):
    name: str
    bank_name: Optional[str] = ""
    account_type: Optional[AccountType] = AccountType.savings
    current_balance: Optional[float] = 0.0
    minimum_balance: Optional[float] = 0.0
    image_url: Optional[str] = None

class BankAccountUpdate(BaseModel):
    name: Optional[str] = None
    bank_name: Optional[str] = None
    account_type: Optional[AccountType] = None
    current_balance: Optional[float] = None
    minimum_balance: Optional[float] = None
    image_url: Optional[str] = None

class BankAccountOut(BaseModel):
    id: int
    name: str
    bank_name: Optional[str]
    account_type: AccountType
    current_balance: float
    minimum_balance: float
    image_url: Optional[str]
    last_updated: Optional[datetime]
    created_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── Transaction Schemas ──────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    date: date
    amount: float
    type: TransactionType
    category_id: Optional[int] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    account_id: Optional[int] = None
    account: Optional[str] = None
    to_account_id: Optional[int] = None
    to_account: Optional[str] = None
    note: Optional[str] = None

class TransactionUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[float] = None
    type: Optional[TransactionType] = None
    category_id: Optional[int] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    account_id: Optional[int] = None
    account: Optional[str] = None
    to_account_id: Optional[int] = None
    to_account: Optional[str] = None
    note: Optional[str] = None

class TransactionOut(BaseModel):
    id: int
    date: date
    amount: float
    type: TransactionType
    category_id: Optional[int]
    category: Optional[str]
    subcategory: Optional[str]
    account_id: Optional[int]
    account: Optional[str]
    to_account_id: Optional[int]
    to_account: Optional[str]
    note: Optional[str]
    created_at: Optional[datetime]
    class Config:
        from_attributes = True


class TransactionBulkCreate(BaseModel):
    transactions: List[TransactionCreate]


# ─── Wishlist Schemas ─────────────────────────────────────────────────────────

class WishlistCreate(BaseModel):
    name: str
    price: Optional[float] = None
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[WishlistPriority] = WishlistPriority.medium
    notes: Optional[str] = None

class WishlistUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[WishlistPriority] = None
    notes: Optional[str] = None
    purchased: Optional[bool] = None

class WishlistOut(BaseModel):
    id: int
    name: str
    price: Optional[float]
    product_url: Optional[str]
    image_url: Optional[str]
    category: Optional[str]
    priority: WishlistPriority
    notes: Optional[str]
    purchased: bool
    added_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── Stock Investment Schemas ─────────────────────────────────────────────────

class StockCreate(BaseModel):
    platform: Optional[str] = None
    instrument_name: str
    amount_invested: float
    units: Optional[float] = None
    date_invested: Optional[date] = None
    account_id: Optional[int] = None
    current_value: Optional[float] = None
    notes: Optional[str] = None

class StockUpdate(BaseModel):
    platform: Optional[str] = None
    instrument_name: Optional[str] = None
    amount_invested: Optional[float] = None
    units: Optional[float] = None
    date_invested: Optional[date] = None
    account_id: Optional[int] = None
    current_value: Optional[float] = None
    notes: Optional[str] = None

class StockOut(BaseModel):
    id: int
    platform: Optional[str]
    instrument_name: str
    amount_invested: float
    units: Optional[float]
    date_invested: Optional[date]
    account_id: Optional[int]
    current_value: Optional[float]
    notes: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── Subscriptions ────────────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    name: str
    amount: float
    billing_cycle: BillingCycle
    next_billing_date: Optional[date] = None
    category: Optional[str] = None
    account_id: Optional[int] = None
    image_url: Optional[str] = None
    status: SubscriptionStatus = SubscriptionStatus.active
    notes: Optional[str] = None

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    billing_cycle: Optional[BillingCycle] = None
    next_billing_date: Optional[date] = None
    category: Optional[str] = None
    account_id: Optional[int] = None
    image_url: Optional[str] = None
    status: Optional[SubscriptionStatus] = None
    notes: Optional[str] = None

class SubscriptionOut(BaseModel):
    id: int
    name: str
    amount: float
    billing_cycle: BillingCycle
    next_billing_date: Optional[date]
    category: Optional[str]
    account_id: Optional[int]
    image_url: Optional[str]
    status: SubscriptionStatus
    notes: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── Settings Schemas ─────────────────────────────────────────────────────────

class SettingsOut(BaseModel):
    key: str
    value: Optional[str]
    class Config:
        from_attributes = True

class SettingsBulkUpdate(BaseModel):
    settings: dict


# ─── CSV Import ───────────────────────────────────────────────────────────────

class CSVPreviewRow(BaseModel):
    row: int
    data: dict
    valid: bool
    errors: List[str]

class CSVImportPreview(BaseModel):
    rows: List[CSVPreviewRow]
    valid_count: int
    error_count: int


# ─── LLM Schemas ─────────────────────────────────────────────────────────────

class LLMChatRequest(BaseModel):
    message: str
    include_summary: Optional[bool] = True

class LLMChatResponse(BaseModel):
    response: str
    model: Optional[str]
    available: bool


# ─── Debt / IOU Schemas ──────────────────────────────────────────────────────

class DebtCreate(BaseModel):
    person_name: str
    amount: float
    direction: DebtDirection
    date_created: date
    due_date: Optional[date] = None
    account_id: Optional[int] = None
    note: Optional[str] = None
    linked_transaction_id: Optional[int] = None

class DebtUpdate(BaseModel):
    person_name: Optional[str] = None
    amount: Optional[float] = None
    direction: Optional[DebtDirection] = None
    date_created: Optional[date] = None
    due_date: Optional[date] = None
    account_id: Optional[int] = None
    note: Optional[str] = None
    linked_transaction_id: Optional[int] = None

class DebtOut(BaseModel):
    id: int
    person_name: str
    amount: float
    direction: DebtDirection
    date_created: date
    due_date: Optional[date]
    account_id: Optional[int]
    account_name: Optional[str] = None
    note: Optional[str]
    status: DebtStatus
    paid_date: Optional[date]
    linked_transaction_id: Optional[int]
    created_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── Mutual Fund Schemas ──────────────────────────────────────────────────────

class MutualFundTransactionCreate(BaseModel):
    date: date
    amount: float
    nav: float
    units: float
    type: Optional[str] = "buy"
    account_id: Optional[int] = None
    notes: Optional[str] = None

class MutualFundTransactionUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[float] = None
    nav: Optional[float] = None
    units: Optional[float] = None
    type: Optional[str] = None
    account_id: Optional[int] = None
    notes: Optional[str] = None

class MutualFundTransactionOut(BaseModel):
    id: int
    fund_id: int
    date: date
    amount: float
    nav: float
    units: float
    type: str
    account_id: Optional[int]
    notes: Optional[str]
    created_at: Optional[datetime]
    class Config:
        from_attributes = True

class MutualFundCreate(BaseModel):
    fund_name: str
    platform: Optional[str] = None
    category: Optional[str] = None
    scheme_code: Optional[str] = None
    current_nav: Optional[float] = None
    notes: Optional[str] = None

class MutualFundUpdate(BaseModel):
    fund_name: Optional[str] = None
    platform: Optional[str] = None
    category: Optional[str] = None
    scheme_code: Optional[str] = None
    current_nav: Optional[float] = None
    notes: Optional[str] = None

class MutualFundOut(BaseModel):
    id: int
    fund_name: str
    platform: Optional[str]
    category: Optional[str]
    scheme_code: Optional[str]
    current_nav: Optional[float]
    notes: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    
    # These fields will be computed and injected by the route
    total_invested: Optional[float] = 0.0
    total_units: Optional[float] = 0.0
    current_value: Optional[float] = 0.0
    transactions: Optional[List[MutualFundTransactionOut]] = []
    
    class Config:
        from_attributes = True

