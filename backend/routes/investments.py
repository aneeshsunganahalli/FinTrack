"""Stock investments CRUD routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.models import get_db, StockInvestment
from backend.models.schemas import StockCreate, StockUpdate, StockOut
from backend.services.twelvedata import TwelveDataService

router = APIRouter(prefix="/api/investments", tags=["investments"])


@router.get("/search")
def search_stock_symbols(q: str = ""):
    return TwelveDataService.search_symbols(q)


@router.post("/refresh-prices")
def refresh_investment_prices(db: Session = Depends(get_db)):
    investments = db.query(StockInvestment).all()
    symbols = [inv.instrument_name for inv in investments if inv.instrument_name]
    
    if not symbols:
        return {"status": "no symbols to update"}
        
    prices = TwelveDataService.get_live_prices(symbols)
    updated_count = 0
    
    for inv in investments:
        if inv.instrument_name in prices:
            inv.current_value = inv.units * prices[inv.instrument_name] if inv.units else prices[inv.instrument_name]
            updated_count += 1
            
    if updated_count > 0:
        db.commit()
        
    return {"status": "ok", "updated": updated_count}


@router.get("", response_model=List[StockOut])
def list_investments(db: Session = Depends(get_db)):
    return db.query(StockInvestment).order_by(StockInvestment.date_invested.desc()).all()


@router.post("", response_model=StockOut, status_code=201)
def create_investment(payload: StockCreate, db: Session = Depends(get_db)):
    inv = StockInvestment(**payload.dict())
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/{iid}", response_model=StockOut)
def get_investment(iid: int, db: Session = Depends(get_db)):
    inv = db.query(StockInvestment).filter_by(id=iid).first()
    if not inv:
        raise HTTPException(404, "Investment not found")
    return inv


@router.patch("/{iid}", response_model=StockOut)
def update_investment(iid: int, payload: StockUpdate, db: Session = Depends(get_db)):
    inv = db.query(StockInvestment).filter_by(id=iid).first()
    if not inv:
        raise HTTPException(404, "Investment not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(inv, k, v)
    db.commit()
    db.refresh(inv)
    return inv


@router.delete("/{iid}", status_code=204)
def delete_investment(iid: int, db: Session = Depends(get_db)):
    inv = db.query(StockInvestment).filter_by(id=iid).first()
    if not inv:
        raise HTTPException(404, "Investment not found")
    db.delete(inv)
    db.commit()
