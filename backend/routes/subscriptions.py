from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.models.database import get_db, Subscription, Transaction, TransactionType, BankAccount
from backend.models.schemas import SubscriptionCreate, SubscriptionUpdate, SubscriptionOut

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

from datetime import date
from dateutil.relativedelta import relativedelta

def process_due_subscriptions(db: Session):
    today = date.today()
    due_subs = db.query(Subscription).filter(
        Subscription.status == "active",
        Subscription.next_billing_date <= today
    ).all()

    processed = 0
    for sub in due_subs:
        # Create a transaction
        tx = Transaction(
            date=sub.next_billing_date, # Date it was due
            amount=sub.amount,
            type=TransactionType.expense,
            category=sub.category or "Subscriptions",
            account_id=sub.account_id,
            note=f"Subscription: {sub.name}"
        )
        
        # Resolve account name
        if sub.account_id:
            acc = db.query(BankAccount).filter_by(id=sub.account_id).first()
            if acc:
                tx.account = acc.name
                acc.current_balance -= sub.amount # deduct from account
        
        db.add(tx)
        
        # Advance next billing date
        if sub.billing_cycle == "monthly":
            sub.next_billing_date += relativedelta(months=1)
        elif sub.billing_cycle == "yearly":
            sub.next_billing_date += relativedelta(years=1)
        elif sub.billing_cycle == "weekly":
            sub.next_billing_date += relativedelta(weeks=1)
            
        # If it's still in the past (e.g. app hasn't been run in months), fast forward to next future date
        while sub.next_billing_date <= today:
            if sub.billing_cycle == "monthly":
                sub.next_billing_date += relativedelta(months=1)
            elif sub.billing_cycle == "yearly":
                sub.next_billing_date += relativedelta(years=1)
            elif sub.billing_cycle == "weekly":
                sub.next_billing_date += relativedelta(weeks=1)

        processed += 1

    if processed > 0:
        db.commit()
    
    return processed

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
