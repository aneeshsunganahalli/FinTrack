"""Dashboard analytics route."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, datetime
from calendar import monthrange

from backend.models import get_db, Transaction, BankAccount, StockInvestment, MutualFund, MutualFundTransaction
from backend.models.database import TransactionType

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _month_range(year: int, month: int):
    _, last_day = monthrange(year, month)
    return date(year, month, 1), date(year, month, last_day)


@router.get("")
def get_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    y, m = today.year, today.month
    this_start, this_end = _month_range(y, m)

    # Previous month
    pm = m - 1 if m > 1 else 12
    py = y if m > 1 else y - 1
    prev_start, prev_end = _month_range(py, pm)

    # ── Total balances ───────────────────────────────────────────────────────
    total_balance = db.query(func.coalesce(func.sum(BankAccount.current_balance), 0.0)).scalar()
    accounts = db.query(BankAccount).all()
    low_balance_alerts = [
        {"id": a.id, "name": a.name, "balance": a.current_balance, "minimum": a.minimum_balance}
        for a in accounts
        if a.current_balance < a.minimum_balance
    ]

    # ── This/last month spend ────────────────────────────────────────────────
    def month_spend(start, end):
        return (
            db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
            .filter(
                Transaction.type == TransactionType.expense,
                Transaction.category.notin_(["Investments", "Transfers"]) | (Transaction.category == None),
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .scalar()
        )

    this_spend = month_spend(this_start, this_end)
    prev_spend = month_spend(prev_start, prev_end)

    this_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.type == TransactionType.income,
            (Transaction.category != "Transfers") | (Transaction.category == None),
            Transaction.date >= this_start,
            Transaction.date <= this_end,
        )
        .scalar()
    )

    # ── Spend by category (this month) ──────────────────────────────────────
    cat_rows = (
        db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
        .filter(
            Transaction.type == TransactionType.expense,
            Transaction.category.notin_(["Investments", "Transfers"]) | (Transaction.category == None),
            Transaction.date >= this_start,
            Transaction.date <= this_end,
        )
        .group_by(Transaction.category)
        .all()
    )
    category_spend = [{"category": r.category or "Uncategorized", "amount": r.total} for r in cat_rows]

    # ── Monthly trend (last 12 months) ──────────────────────────────────────
    monthly_trend = []
    for i in range(11, -1, -1):
        mo = (m - i - 1) % 12 + 1
        yr = y - (i + (m == 1)) // 12 if m - i <= 0 else y - i // 12
        # simpler calc
        from datetime import timedelta
        ref = date(y, m, 1) - timedelta(days=30 * i)
        s, e = _month_range(ref.year, ref.month)
        spend = month_spend(s, e)
        income_val = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
            .filter(
                Transaction.type == TransactionType.income,
                (Transaction.category != "Transfers") | (Transaction.category == None),
                Transaction.date >= s,
                Transaction.date <= e,
            )
            .scalar()
        )
        monthly_trend.append({
            "month": ref.strftime("%b %Y"),
            "expense": spend,
            "income": income_val,
        })

    # ── Investments snapshot ─────────────────────────────────────────────────
    stocks_invested = db.query(func.coalesce(func.sum(StockInvestment.amount_invested), 0.0)).scalar()
    stocks_current = db.query(func.coalesce(func.sum(StockInvestment.current_value), 0.0)).scalar()
    
    # Calculate Mutual Funds
    mf_invested = 0.0
    mf_current = 0.0
    mutual_funds = db.query(MutualFund).all()
    
    # Fetch recent SIPs this month
    sips_this_month = (
        db.query(MutualFundTransaction, MutualFund.fund_name)
        .join(MutualFund, MutualFund.id == MutualFundTransaction.fund_id)
        .filter(
            MutualFundTransaction.type == "buy",
            MutualFundTransaction.date >= this_start,
            MutualFundTransaction.date <= this_end
        )
        .order_by(MutualFundTransaction.date.desc())
        .limit(10)
        .all()
    )
    sip_calendar = []
    for tx, fname in sips_this_month:
        sip_calendar.append({
            "fund_name": fname,
            "amount": tx.amount,
            "date": tx.date.isoformat(),
            "units": tx.units
        })

    for f in mutual_funds:
        txs = db.query(MutualFundTransaction).filter(MutualFundTransaction.fund_id == f.id).all()
        f_invested = 0.0
        f_units = 0.0
        for tx in txs:
            if tx.type == "buy":
                f_invested += tx.amount
                f_units += tx.units
            elif tx.type == "sell":
                f_invested -= tx.amount
                f_units -= tx.units
        mf_invested += f_invested
        mf_current += (f_units * f.current_nav) if f.current_nav else f_invested

    total_invested = stocks_invested + mf_invested
    total_current = stocks_current + mf_current

    return {
        "total_balance": total_balance,
        "this_month_spend": this_spend,
        "prev_month_spend": prev_spend,
        "this_month_income": this_income,
        "low_balance_alerts": low_balance_alerts,
        "category_spend": category_spend,
        "monthly_trend": monthly_trend,
        "investments": {
            "total_invested": total_invested,
            "total_current": total_current,
            "gain_loss": total_current - total_invested,
            "allocation": {
                "Stocks": stocks_current or stocks_invested,
                "Mutual Funds": mf_current or mf_invested
            },
            "sip_calendar": sip_calendar
        },
    }

@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    period: str = "this_month",   # this_month | last_3 | all
    date_from: str = None,
    date_to: str = None,
):
    today = date.today()

    if period == "this_month":
        y, m = today.year, today.month
        d_from, d_to = _month_range(y, m)
    elif period == "last_3":
        from datetime import timedelta
        d_to = today
        d_from = date(today.year, today.month, 1)
        for _ in range(2):
            d_from = (d_from - timedelta(days=1))
            d_from = date(d_from.year, d_from.month, 1)
    elif period == "custom" and date_from and date_to:
        d_from = date.fromisoformat(date_from)
        d_to = date.fromisoformat(date_to)
    else:
        d_from = date(2000, 1, 1)
        d_to = today

    cat_rows = (
        db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
        .filter(
            Transaction.type == TransactionType.expense,
            Transaction.category.notin_(["Investments", "Transfers"]) | (Transaction.category == None),
            Transaction.date >= d_from,
            Transaction.date <= d_to,
        )
        .group_by(Transaction.category)
        .all()
    )

    return {
        "period": period,
        "date_from": d_from.isoformat(),
        "date_to": d_to.isoformat(),
        "category_spend": [{"category": r.category or "Uncategorized", "amount": r.total} for r in cat_rows],
    }
