"""Transaction CRUD routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract
from typing import List, Optional
from datetime import date

from backend.models import get_db, Transaction, BankAccount
from backend.models.schemas import (
    TransactionCreate, TransactionUpdate, TransactionOut, TransactionBulkCreate,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _adjust_balance(db: Session, account_id: int | None, amount: float, tx_type: str, reverse: bool = False, to_account_id: int | None = None):
    """Adjust a bank account's balance for a transaction.
    reverse=True undoes the original effect (used for deletes and the 'old' side of updates).
    """
    if account_id:
        acc = db.query(BankAccount).filter_by(id=account_id).first()
        if acc:
            if reverse:
                # Undo: income was added → subtract; expense/transfer was subtracted → add
                if tx_type == "income":
                    if acc.current_balance < amount:
                        raise HTTPException(status_code=400, detail=f"Insufficient funds in {acc.name} to reverse income.")
                    acc.current_balance -= amount
                else:
                    acc.current_balance += amount
            else:
                # Apply: income → add; expense/transfer → subtract
                if tx_type == "income":
                    acc.current_balance += amount
                else:
                    if acc.current_balance < amount:
                        raise HTTPException(status_code=400, detail=f"Insufficient funds in {acc.name}.")
                    acc.current_balance -= amount

    if tx_type == "transfer" and to_account_id:
        to_acc = db.query(BankAccount).filter_by(id=to_account_id).first()
        if to_acc:
            if reverse:
                if to_acc.current_balance < amount:
                    raise HTTPException(status_code=400, detail=f"Insufficient funds in {to_acc.name} to reverse transfer.")
                to_acc.current_balance -= amount
            else:
                to_acc.current_balance += amount


@router.get("", response_model=List[TransactionOut])
def list_transactions(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 200,
    category: Optional[str] = None,
    account_id: Optional[int] = None,
    type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    q = db.query(Transaction)
    if category:
        q = q.filter(Transaction.category == category)
    else:
        # Exclude Investments category by default
        q = q.filter((Transaction.category != "Investments") | (Transaction.category == None))
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    if type:
        q = q.filter(Transaction.type == type)
    if date_from:
        q = q.filter(Transaction.date >= date_from)
    if date_to:
        q = q.filter(Transaction.date <= date_to)
    return q.order_by(Transaction.date.desc(), Transaction.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    data = payload.dict()
    # Resolve account name from id
    if data.get("account_id") and not data.get("account"):
        acc = db.query(BankAccount).filter_by(id=data["account_id"]).first()
        if acc:
            data["account"] = acc.name
    if data.get("to_account_id") and not data.get("to_account"):
        to_acc = db.query(BankAccount).filter_by(id=data["to_account_id"]).first()
        if to_acc:
            data["to_account"] = to_acc.name
    t = Transaction(**data)
    db.add(t)

    # Adjust bank account balance
    _adjust_balance(db, t.account_id, t.amount, t.type.value, to_account_id=t.to_account_id)

    db.commit()
    db.refresh(t)
    return t


@router.post("/bulk", response_model=List[TransactionOut], status_code=201)
def create_transactions_bulk(payload: TransactionBulkCreate, db: Session = Depends(get_db)):
    """Create multiple transactions at once, adjusting account balances for each."""
    created = []
    for tx_data in payload.transactions:
        data = tx_data.dict()
        if data.get("account_id") and not data.get("account"):
            acc = db.query(BankAccount).filter_by(id=data["account_id"]).first()
            if acc:
                data["account"] = acc.name
        if data.get("to_account_id") and not data.get("to_account"):
            to_acc = db.query(BankAccount).filter_by(id=data["to_account_id"]).first()
            if to_acc:
                data["to_account"] = to_acc.name
        t = Transaction(**data)
        db.add(t)
        _adjust_balance(db, t.account_id, t.amount, t.type.value, to_account_id=t.to_account_id)
        db.flush()  # get id assigned
        created.append(t)

    db.commit()
    for t in created:
        db.refresh(t)
    return created


@router.get("/{tid}", response_model=TransactionOut)
def get_transaction(tid: int, db: Session = Depends(get_db)):
    t = db.query(Transaction).filter_by(id=tid).first()
    if not t:
        raise HTTPException(404, "Transaction not found")
    return t


@router.patch("/{tid}", response_model=TransactionOut)
def update_transaction(tid: int, payload: TransactionUpdate, db: Session = Depends(get_db)):
    t = db.query(Transaction).filter_by(id=tid).first()
    if not t:
        raise HTTPException(404, "Transaction not found")

    # Reverse old balance effect
    _adjust_balance(db, t.account_id, t.amount, t.type.value, reverse=True, to_account_id=t.to_account_id)

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(t, k, v)

    # Apply new balance effect
    _adjust_balance(db, t.account_id, t.amount, t.type.value, to_account_id=t.to_account_id)

    db.commit()
    db.refresh(t)
    return t


@router.delete("/{tid}", status_code=204)
def delete_transaction(tid: int, db: Session = Depends(get_db)):
    t = db.query(Transaction).filter_by(id=tid).first()
    if not t:
        raise HTTPException(404, "Transaction not found")

    # Reverse balance effect
    _adjust_balance(db, t.account_id, t.amount, t.type.value, reverse=True, to_account_id=t.to_account_id)

    db.delete(t)
    db.commit()
