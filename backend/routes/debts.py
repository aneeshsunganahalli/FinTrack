"""Debt / IOU CRUD routes with mark-paid balance adjustment."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from backend.models import get_db, Debt, BankAccount, Transaction
from backend.models.database import DebtDirection, DebtStatus, TransactionType
from backend.models.schemas import DebtCreate, DebtUpdate, DebtOut

router = APIRouter(prefix="/api/debts", tags=["debts"])


def _debt_to_out(debt: Debt, db: Session) -> dict:
    """Convert a Debt ORM object to DebtOut-compatible dict with account_name."""
    d = {
        "id": debt.id,
        "person_name": debt.person_name,
        "amount": debt.amount,
        "direction": debt.direction,
        "date_created": debt.date_created,
        "due_date": debt.due_date,
        "account_id": debt.account_id,
        "note": debt.note,
        "status": debt.status,
        "paid_date": debt.paid_date,
        "created_at": debt.created_at,
        "account_name": None,
    }
    if debt.account_id:
        acc = db.query(BankAccount).filter_by(id=debt.account_id).first()
        if acc:
            d["account_name"] = acc.name
    return d


@router.get("", response_model=List[DebtOut])
def list_debts(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
):
    q = db.query(Debt)
    if status:
        q = q.filter(Debt.status == status)
    debts = q.order_by(Debt.date_created.desc()).all()
    return [_debt_to_out(d, db) for d in debts]


@router.post("", response_model=DebtOut, status_code=201)
def create_debt(payload: DebtCreate, db: Session = Depends(get_db)):
    debt = Debt(**payload.dict())
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return _debt_to_out(debt, db)


@router.get("/{debt_id}", response_model=DebtOut)
def get_debt(debt_id: int, db: Session = Depends(get_db)):
    debt = db.query(Debt).filter_by(id=debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    return _debt_to_out(debt, db)


@router.patch("/{debt_id}", response_model=DebtOut)
def update_debt(debt_id: int, payload: DebtUpdate, db: Session = Depends(get_db)):
    debt = db.query(Debt).filter_by(id=debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(debt, k, v)
    db.commit()
    db.refresh(debt)
    return _debt_to_out(debt, db)


@router.delete("/{debt_id}", status_code=204)
def delete_debt(debt_id: int, db: Session = Depends(get_db)):
    debt = db.query(Debt).filter_by(id=debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    db.delete(debt)
    db.commit()


@router.post("/{debt_id}/mark-paid", response_model=DebtOut)
def mark_debt_paid(debt_id: int, db: Session = Depends(get_db)):
    """Mark a debt as paid and create a corresponding transaction to adjust bank balance."""
    debt = db.query(Debt).filter_by(id=debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    if debt.status == DebtStatus.paid:
        raise HTTPException(400, "Debt is already marked as paid")

    today = date.today()
    debt.status = DebtStatus.paid
    debt.paid_date = today

    # Create a transaction to adjust the bank balance
    if debt.account_id:
        acc = db.query(BankAccount).filter_by(id=debt.account_id).first()
        if acc:
            if debt.direction == DebtDirection.owed_to_me:
                # Someone paid me back → incoming transfer (marked as income to adjust balance easily)
                tx_type = TransactionType.income
                acc.current_balance += debt.amount
            else:
                # I paid someone back → outgoing transfer (marked as expense to adjust balance easily)
                tx_type = TransactionType.expense
                acc.current_balance -= debt.amount

            tx = Transaction(
                date=today,
                amount=debt.amount,
                type=tx_type,
                category="Transfers",
                account_id=debt.account_id,
                account=acc.name,
                note=f"IOU settled: {debt.person_name}",
            )
            db.add(tx)

    db.commit()
    db.refresh(debt)
    return _debt_to_out(debt, db)
