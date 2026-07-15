from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.models.database import get_db, Subscription
from backend.models.schemas import SubscriptionCreate, SubscriptionUpdate, SubscriptionOut

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

@router.get("", response_model=List[SubscriptionOut])
def list_subscriptions(db: Session = Depends(get_db)):
    return db.query(Subscription).order_by(Subscription.next_billing_date).all()

@router.post("", response_model=SubscriptionOut)
def create_subscription(payload: SubscriptionCreate, db: Session = Depends(get_db)):
    sub = Subscription(**payload.dict())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

@router.patch("/{sub_id}", response_model=SubscriptionOut)
def update_subscription(sub_id: int, payload: SubscriptionUpdate, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(sub, k, v)

    db.commit()
    db.refresh(sub)
    return sub

@router.delete("/{sub_id}")
def delete_subscription(sub_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    
    db.delete(sub)
    db.commit()
    return {"ok": True}
