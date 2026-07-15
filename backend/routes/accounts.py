"""Bank account CRUD routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.models import get_db, BankAccount
from backend.models.schemas import BankAccountCreate, BankAccountUpdate, BankAccountOut

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=List[BankAccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(BankAccount).order_by(BankAccount.name).all()


@router.post("", response_model=BankAccountOut, status_code=201)
def create_account(payload: BankAccountCreate, db: Session = Depends(get_db)):
    acc = BankAccount(**payload.dict())
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.get("/{aid}", response_model=BankAccountOut)
def get_account(aid: int, db: Session = Depends(get_db)):
    acc = db.query(BankAccount).filter_by(id=aid).first()
    if not acc:
        raise HTTPException(404, "Account not found")
    return acc


@router.patch("/{aid}", response_model=BankAccountOut)
def update_account(aid: int, payload: BankAccountUpdate, db: Session = Depends(get_db)):
    acc = db.query(BankAccount).filter_by(id=aid).first()
    if not acc:
        raise HTTPException(404, "Account not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(acc, k, v)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/{aid}", status_code=204)
def delete_account(aid: int, db: Session = Depends(get_db)):
    acc = db.query(BankAccount).filter_by(id=aid).first()
    if not acc:
        raise HTTPException(404, "Account not found")
    db.delete(acc)
    db.commit()
