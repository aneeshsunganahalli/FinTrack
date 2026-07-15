"""Transaction CRUD routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, extract
from typing import List, Optional
from datetime import date

from backend.models import get_db, Transaction, BankAccount
from backend.models.schemas import TransactionCreate, TransactionUpdate, TransactionOut

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


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
    t = Transaction(**data)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


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
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{tid}", status_code=204)
def delete_transaction(tid: int, db: Session = Depends(get_db)):
    t = db.query(Transaction).filter_by(id=tid).first()
    if not t:
        raise HTTPException(404, "Transaction not found")
    db.delete(t)
    db.commit()
