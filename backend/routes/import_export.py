"""CSV import/export routes."""
import csv
import io
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.models import get_db, Transaction, BankAccount, StockInvestment, Category
from backend.models.database import TransactionType, AccountType
from backend.models.schemas import CSVPreviewRow, CSVImportPreview

router = APIRouter(prefix="/api/import", tags=["import"])


# ─── Templates ────────────────────────────────────────────────────────────────

TRANSACTION_HEADERS = ["date", "amount", "type", "category", "account", "note", "subcategory"]
ACCOUNT_HEADERS = ["name", "bank_name", "account_type", "current_balance", "minimum_balance"]
STOCK_HEADERS = ["platform", "instrument_name", "amount_invested", "units", "date_invested", "current_value", "notes"]


def _csv_response(rows: list, headers: list, filename: str):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/template/transactions")
def download_transactions_template():
    sample = [
        {"date": "2024-01-15", "amount": "500.00", "type": "expense", "category": "Food & Dining",
         "account": "HDFC Savings", "note": "Lunch", "subcategory": "Restaurant"},
        {"date": "2024-01-01", "amount": "50000.00", "type": "income", "category": "Salary",
         "account": "HDFC Savings", "note": "January salary", "subcategory": ""},
    ]
    return _csv_response(sample, TRANSACTION_HEADERS, "transactions_template.csv")


@router.get("/template/accounts")
def download_accounts_template():
    sample = [
        {"name": "HDFC Savings", "bank_name": "HDFC Bank", "account_type": "savings",
         "current_balance": "25000.00", "minimum_balance": "10000.00"},
    ]
    return _csv_response(sample, ACCOUNT_HEADERS, "accounts_template.csv")


@router.get("/template/investments")
def download_investments_template():
    sample = [
        {"platform": "Zerodha", "instrument_name": "Nifty 50 Index Fund",
         "amount_invested": "10000.00", "units": "100.5", "date_invested": "2024-01-01",
         "current_value": "11500.00", "notes": "SIP"},
    ]
    return _csv_response(sample, STOCK_HEADERS, "investments_template.csv")


# ─── Preview (parse without committing) ──────────────────────────────────────

@router.post("/preview/transactions", response_model=CSVImportPreview)
async def preview_transactions(file: UploadFile = File(...)):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    rows, valid_count, error_count = [], 0, 0

    for i, row in enumerate(reader, start=2):  # row 1 = header
        errors = []
        try:
            _date = date.fromisoformat(row.get("date", "").strip())
        except ValueError:
            errors.append(f"Invalid date: '{row.get('date')}'")
        try:
            amt = float(row.get("amount", "").strip())
        except ValueError:
            errors.append(f"Invalid amount: '{row.get('amount')}'")
        t = row.get("type", "").strip().lower()
        if t not in ("income", "expense"):
            errors.append(f"Type must be 'income' or 'expense', got '{t}'")

        valid = len(errors) == 0
        valid_count += valid
        error_count += not valid
        rows.append(CSVPreviewRow(row=i, data=dict(row), valid=valid, errors=errors))

    return CSVImportPreview(rows=rows, valid_count=valid_count, error_count=error_count)


@router.post("/commit/transactions")
async def commit_transactions(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    inserted = 0
    skipped = 0

    for row in reader:
        try:
            t = Transaction(
                date=date.fromisoformat(row["date"].strip()),
                amount=float(row["amount"].strip()),
                type=TransactionType(row["type"].strip().lower()),
                category=row.get("category", "").strip() or None,
                subcategory=row.get("subcategory", "").strip() or None,
                account=row.get("account", "").strip() or None,
                note=row.get("note", "").strip() or None,
            )
            db.add(t)
            inserted += 1
        except Exception:
            skipped += 1

    db.commit()
    return {"inserted": inserted, "skipped": skipped}


@router.post("/commit/accounts")
async def commit_accounts(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    inserted, skipped = 0, 0

    for row in reader:
        try:
            acc = BankAccount(
                name=row["name"].strip(),
                bank_name=row.get("bank_name", "").strip(),
                account_type=AccountType(row.get("account_type", "savings").strip().lower()),
                current_balance=float(row.get("current_balance", 0)),
                minimum_balance=float(row.get("minimum_balance", 0)),
            )
            db.add(acc)
            inserted += 1
        except Exception:
            skipped += 1

    db.commit()
    return {"inserted": inserted, "skipped": skipped}


@router.post("/commit/investments")
async def commit_investments(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    inserted, skipped = 0, 0

    for row in reader:
        try:
            from backend.models import StockInvestment
            inv = StockInvestment(
                platform=row.get("platform", "").strip() or None,
                instrument_name=row["instrument_name"].strip(),
                amount_invested=float(row["amount_invested"]),
                units=float(row["units"]) if row.get("units") else None,
                date_invested=date.fromisoformat(row["date_invested"].strip()) if row.get("date_invested") else None,
                current_value=float(row["current_value"]) if row.get("current_value") else None,
                notes=row.get("notes", "").strip() or None,
            )
            db.add(inv)
            inserted += 1
        except Exception:
            skipped += 1

    db.commit()
    return {"inserted": inserted, "skipped": skipped}
