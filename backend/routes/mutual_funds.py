"""Mutual Funds CRUD routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import httpx
import json
import time

_nav_cache = {}
_search_cache = {}
CACHE_TTL = 12 * 3600  # 12 hours

from backend.models import get_db, MutualFund, MutualFundTransaction, Transaction, BankAccount
from backend.models.database import TransactionType
from backend.models.schemas import (
    MutualFundCreate, MutualFundUpdate, MutualFundOut,
    MutualFundTransactionCreate, MutualFundTransactionUpdate, MutualFundTransactionOut
)
from backend.routes.transactions import _adjust_balance

router = APIRouter(prefix="/api/mutual-funds", tags=["mutual-funds"])

# ─── Search API ───────────────────────────────────────────────────────────────
@router.get("/search")
def search_mutual_funds(q: str):
    if not q or len(q) < 3:
        return []
    
    q_lower = q.lower()
    if q_lower in _search_cache:
        data, timestamp = _search_cache[q_lower]
        if time.time() - timestamp < CACHE_TTL:
            return data

    try:
        res = httpx.get(f"https://api.mfapi.in/mf/search?q={q}", timeout=5)
        if res.status_code == 200:
            data = res.json()
            _search_cache[q_lower] = (data, time.time())
            return data
        return []
    except Exception:
        return []

# ─── Get Info ─────────────────────────────────────────────────────────────────
@router.get("/info/{scheme_code}")
def get_mutual_fund_info(scheme_code: str):
    if scheme_code in _nav_cache:
        data, timestamp = _nav_cache[scheme_code]
        if time.time() - timestamp < CACHE_TTL:
            return data

    try:
        res = httpx.get(f"https://api.mfapi.in/mf/{scheme_code}", timeout=5)
        if res.status_code == 200:
            data = res.json()
            _nav_cache[scheme_code] = (data, time.time())
            return data
        return {}
    except Exception:
        return {}

# ─── Refresh Prices ───────────────────────────────────────────────────────────
@router.post("/refresh-prices")
def refresh_mutual_fund_prices(db: Session = Depends(get_db)):
    funds = db.query(MutualFund).filter(MutualFund.scheme_code != None).all()
    updated = 0
    
    # Track which scheme codes we've already fetched in this run to avoid redundant calls
    fetched_navs = {}

    for f in funds:
        if not f.scheme_code:
            continue
        
        # Check local run cache first
        if f.scheme_code in fetched_navs:
            f.current_nav = fetched_navs[f.scheme_code]
            updated += 1
            continue

        # Check global TTL cache
        if f.scheme_code in _nav_cache:
            data, timestamp = _nav_cache[f.scheme_code]
            if time.time() - timestamp < CACHE_TTL:
                nav_list = data.get("data", [])
                if nav_list and len(nav_list) > 0:
                    latest_nav = nav_list[0].get("nav")
                    if latest_nav:
                        nav_val = float(latest_nav)
                        f.current_nav = nav_val
                        fetched_navs[f.scheme_code] = nav_val
                        updated += 1
                        continue

        try:
            res = httpx.get(f"https://api.mfapi.in/mf/{f.scheme_code}", timeout=5)
            if res.status_code == 200:
                data = res.json()
                nav_list = data.get("data", [])
                if nav_list and len(nav_list) > 0:
                    latest_nav = nav_list[0].get("nav")
                    if latest_nav:
                        nav_val = float(latest_nav)
                        f.current_nav = nav_val
                        fetched_navs[f.scheme_code] = nav_val
                        _nav_cache[f.scheme_code] = (data, time.time())
                        updated += 1
        except Exception:
            pass
            
    db.commit()
    return {"message": f"Updated NAV for {updated} funds"}


# ─── Mutual Funds ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[MutualFundOut])
def list_mutual_funds(db: Session = Depends(get_db)):
    funds = db.query(MutualFund).all()
    results = []
    for f in funds:
        # Compute dynamic fields
        txs = db.query(MutualFundTransaction).filter(MutualFundTransaction.fund_id == f.id).all()
        
        total_invested = 0.0
        total_units = 0.0
        
        for tx in txs:
            if tx.type == "buy":
                total_invested += tx.amount
                total_units += tx.units
            elif tx.type == "sell":
                # For sell, we deduct units.
                # Keeping it simple: amount returned is deducted from total_invested.
                total_invested -= tx.amount
                total_units -= tx.units
                
        current_value = (total_units * f.current_nav) if f.current_nav else total_invested
        
        f_dict = {
            "id": f.id,
            "fund_name": f.fund_name,
            "platform": f.platform,
            "category": f.category,
            "scheme_code": f.scheme_code,
            "current_nav": f.current_nav,
            "notes": f.notes,
            "created_at": f.created_at,
            "updated_at": f.updated_at,
            "total_invested": total_invested,
            "total_units": total_units,
            "current_value": current_value,
            "transactions": txs
        }
        results.append(f_dict)
    
    return results

@router.post("", response_model=MutualFundOut, status_code=201)
def create_mutual_fund(payload: MutualFundCreate, db: Session = Depends(get_db)):
    f = MutualFund(**payload.dict())
    db.add(f)
    db.commit()
    db.refresh(f)
    return {**f.__dict__, "total_invested": 0.0, "total_units": 0.0, "current_value": 0.0, "transactions": []}

@router.get("/{fid}", response_model=MutualFundOut)
def get_mutual_fund(fid: int, db: Session = Depends(get_db)):
    f = db.query(MutualFund).filter_by(id=fid).first()
    if not f:
        raise HTTPException(404, "Mutual Fund not found")
        
    txs = db.query(MutualFundTransaction).filter(MutualFundTransaction.fund_id == f.id).all()
    total_invested = sum(tx.amount if tx.type == 'buy' else -tx.amount for tx in txs)
    total_units = sum(tx.units if tx.type == 'buy' else -tx.units for tx in txs)
    current_value = (total_units * f.current_nav) if f.current_nav else total_invested
    
    return {
        **f.__dict__,
        "total_invested": total_invested,
        "total_units": total_units,
        "current_value": current_value,
        "transactions": txs
    }

@router.patch("/{fid}", response_model=MutualFundOut)
def update_mutual_fund(fid: int, payload: MutualFundUpdate, db: Session = Depends(get_db)):
    f = db.query(MutualFund).filter_by(id=fid).first()
    if not f:
        raise HTTPException(404, "Mutual Fund not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(f, k, v)
    db.commit()
    return get_mutual_fund(fid, db)

@router.delete("/{fid}", status_code=204)
def delete_mutual_fund(fid: int, db: Session = Depends(get_db)):
    f = db.query(MutualFund).filter_by(id=fid).first()
    if not f:
        raise HTTPException(404, "Mutual Fund not found")
    db.delete(f)
    db.commit()


# ─── Transactions (SIPs/Redemptions) ──────────────────────────────────────────

@router.post("/{fid}/transactions", response_model=MutualFundTransactionOut, status_code=201)
def create_transaction(fid: int, payload: MutualFundTransactionCreate, db: Session = Depends(get_db)):
    f = db.query(MutualFund).filter_by(id=fid).first()
    if not f:
        raise HTTPException(404, "Mutual Fund not found")
    tx = MutualFundTransaction(**payload.dict(), fund_id=fid)
    db.add(tx)
    
    if tx.account_id:
        acc = db.query(BankAccount).filter_by(id=tx.account_id).first()
        if acc:
            ttype = TransactionType.expense if tx.type == "buy" else TransactionType.income
            tx_record = Transaction(
                date=tx.date,
                amount=tx.amount,
                type=ttype,
                category="Investments",
                account_id=acc.id,
                account=acc.name,
                note=f"Mutual Fund {tx.type.capitalize()}: {f.fund_name}"
            )
            db.add(tx_record)
            _adjust_balance(db, acc.id, tx.amount, ttype.value)
            
    db.commit()
    db.refresh(tx)
    return tx

@router.patch("/{fid}/transactions/{tid}", response_model=MutualFundTransactionOut)
def update_transaction(fid: int, tid: int, payload: MutualFundTransactionUpdate, db: Session = Depends(get_db)):
    tx = db.query(MutualFundTransaction).filter_by(id=tid, fund_id=fid).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(tx, k, v)
    db.commit()
    db.refresh(tx)
    return tx

@router.delete("/{fid}/transactions/{tid}", status_code=204)
def delete_transaction(fid: int, tid: int, db: Session = Depends(get_db)):
    tx = db.query(MutualFundTransaction).filter_by(id=tid, fund_id=fid).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    
    if tx.account_id:
        ttype = TransactionType.expense if tx.type == "buy" else TransactionType.income
        tx_record = db.query(Transaction).filter_by(
            account_id=tx.account_id,
            amount=tx.amount,
            type=ttype,
            category="Investments"
        ).first()
        if tx_record:
            _adjust_balance(db, tx_record.account_id, tx_record.amount, tx_record.type.value, reverse=True)
            db.delete(tx_record)
            
    db.delete(tx)
    db.commit()
