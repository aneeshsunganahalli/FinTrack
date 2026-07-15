"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import date, datetime
from backend.models.database import TransactionType, AccountType, WishlistPriority


# ─── Category Schemas ─────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "tag"
    color: Optional[str] = "#00D09C"

class CategoryUpdate(BaseModel):
    name: Optional[str]
    icon: Optional[str]
    color: Optional[str]

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

class BankAccountUpdate(BaseModel):
    name: Optional[str]
    bank_name: Optional[str]
    account_type: Optional[AccountType]
    current_balance: Optional[float]
    minimum_balance: Optional[float]

class BankAccountOut(BaseModel):
    id: int
    name: str
    bank_name: Optional[str]
    account_type: AccountType
    current_balance: float
    minimum_balance: float
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
    note: Optional[str] = None

class TransactionUpdate(BaseModel):
    date: Optional[date]
    amount: Optional[float]
    type: Optional[TransactionType]
    category_id: Optional[int]
    category: Optional[str]
    subcategory: Optional[str]
    account_id: Optional[int]
    account: Optional[str]
    note: Optional[str]

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
    name: Optional[str]
    price: Optional[float]
    product_url: Optional[str]
    image_url: Optional[str]
    category: Optional[str]
    priority: Optional[WishlistPriority]
    notes: Optional[str]
    purchased: Optional[bool]

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
    current_value: Optional[float] = None
    notes: Optional[str] = None

class StockUpdate(BaseModel):
    platform: Optional[str]
    instrument_name: Optional[str]
    amount_invested: Optional[float]
    units: Optional[float]
    date_invested: Optional[date]
    current_value: Optional[float]
    notes: Optional[str]

class StockOut(BaseModel):
    id: int
    platform: Optional[str]
    instrument_name: str
    amount_invested: float
    units: Optional[float]
    date_invested: Optional[date]
    current_value: Optional[float]
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
