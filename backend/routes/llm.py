"""LLM / Ollama chat routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from calendar import monthrange

from backend.models import get_db, Transaction, BankAccount, StockInvestment, Settings
from backend.models.database import TransactionType
from backend.models.schemas import LLMChatRequest, LLMChatResponse
from backend.services.llm_client import get_llm_client

router = APIRouter(prefix="/api/llm", tags=["llm"])


def _get_ollama_config(db: Session):
    url_row = db.query(Settings).filter_by(key="ollama_url").first()
    model_row = db.query(Settings).filter_by(key="ollama_model").first()
    return (
        url_row.value if url_row else "http://localhost:11434",
        model_row.value if model_row else "llama3",
    )


def _build_finance_context(db: Session) -> str:
    today = date.today()
    y, m = today.year, today.month
    _, last_day = monthrange(y, m)
    this_start = date(y, m, 1)
    this_end = date(y, m, last_day)

    total_balance = db.query(func.coalesce(func.sum(BankAccount.current_balance), 0.0)).scalar()

    this_spend = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(Transaction.type == TransactionType.expense, Transaction.date >= this_start, Transaction.date <= this_end)
        .scalar()
    )
    this_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(Transaction.type == TransactionType.income, Transaction.date >= this_start, Transaction.date <= this_end)
        .scalar()
    )

    cat_rows = (
        db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
        .filter(Transaction.type == TransactionType.expense, Transaction.date >= this_start, Transaction.date <= this_end)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(10)
        .all()
    )

    total_invested = db.query(func.coalesce(func.sum(StockInvestment.amount_invested), 0.0)).scalar()
    total_current = db.query(func.coalesce(func.sum(StockInvestment.current_value), 0.0)).scalar()

    lines = [
        f"Financial summary as of {today.isoformat()}:",
        f"- Total bank balance: ₹{total_balance:,.2f}",
        f"- This month's income: ₹{this_income:,.2f}",
        f"- This month's expenses: ₹{this_spend:,.2f}",
        f"- Net this month: ₹{(this_income - this_spend):,.2f}",
        f"- Total invested: ₹{total_invested:,.2f}",
        f"- Current portfolio value: ₹{total_current:,.2f}",
        f"- Portfolio gain/loss: ₹{(total_current - total_invested):,.2f}",
        "",
        "Top spending categories this month:",
    ]
    for r in cat_rows:
        lines.append(f"  - {r.category or 'Uncategorized'}: ₹{r.total:,.2f}")

    lines.append("\nPlease act as a helpful personal finance advisor and answer the user's question.")
    return "\n".join(lines)


@router.get("/status")
async def llm_status(db: Session = Depends(get_db)):
    url, model = _get_ollama_config(db)
    client = get_llm_client(url, model)
    available = await client.check_availability()
    return {"available": available, "url": url, "model": model}


@router.post("/chat", response_model=LLMChatResponse)
async def llm_chat(payload: LLMChatRequest, db: Session = Depends(get_db)):
    url, model = _get_ollama_config(db)
    client = get_llm_client(url, model)

    context = ""
    if payload.include_summary:
        context = _build_finance_context(db)

    result = await client.chat(payload.message, context=context)
    return LLMChatResponse(
        response=result.get("response", result.get("error", "No response")),
        model=result.get("model"),
        available=result.get("available", False),
    )
