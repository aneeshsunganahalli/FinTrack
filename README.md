# FinTrack — Local Personal Finance Tracker

A fully local, privacy-first personal finance tracker. No cloud, no telemetry, all data stored in a local SQLite database.

![Dark fintech UI](https://img.shields.io/badge/theme-dark%20fintech-00D09C)
![Python](https://img.shields.io/badge/backend-FastAPI-009688)
![React](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB)

---

## Features

| Feature | Details |
|---|---|
| **Dashboard** | Total balance, monthly spend/income, pie chart, low-balance alerts |
| **Transactions** | Add/edit/delete with search and filters by date, category, account |
| **Bank Accounts** | Balance tracking with minimum-balance progress bars |
| **Wishlist** | Product cards with auto Open-Graph image fetch |
| **Investments** | P&L tracking, bar chart per instrument |
| **Analytics** | Pie + trend charts, selectable time ranges |
| **CSV Import** | Download templates, upload & preview before committing |
| **AI Insights** | Local Ollama chat with your financial summary as context |
| **Settings** | Currency, categories, Ollama config |

---

## Quick Start

### Prerequisites

```bash
# Python 3.10+
python3 --version

# Node 18+
node --version
```

### 1. Install backend dependencies

```bash
cd /home/aneesh/Programming/Finance
pip install -r requirements.txt
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Run (both servers with one script)

```bash
chmod +x start.sh
./start.sh
```

Or run them separately:

```bash
# Terminal 1 — Backend
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Then open **http://localhost:5173** in your browser.

- Backend API docs: **http://localhost:8000/docs**

---

## Project Structure

```
Finance/
├── main.py                  # FastAPI entrypoint
├── requirements.txt
├── start.sh                 # One-command launcher
├── finance.db               # SQLite DB (auto-created on first run)
├── backend/
│   ├── models/
│   │   ├── database.py      # SQLAlchemy models + seed data
│   │   └── schemas.py       # Pydantic request/response schemas
│   ├── routes/
│   │   ├── transactions.py
│   │   ├── accounts.py
│   │   ├── wishlist.py
│   │   ├── investments.py
│   │   ├── categories.py
│   │   ├── dashboard.py
│   │   ├── settings.py
│   │   ├── import_export.py
│   │   └── llm.py
│   └── services/
│       ├── llm_client.py    # Ollama abstraction
│       └── og_scraper.py    # Open Graph URL preview
└── frontend/
    └── src/
        ├── lib/
        │   ├── api.js       # Axios client
        │   └── utils.js     # Formatting helpers
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Modal.jsx
        │   ├── Spinner.jsx
        │   └── Toast.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── Transactions.jsx
            ├── Accounts.jsx
            ├── Wishlist.jsx
            ├── Investments.jsx
            ├── Analytics.jsx
            ├── ImportExport.jsx
            ├── AIInsights.jsx
            └── Settings.jsx
```

---

## CSV Templates

Download directly from the running app at:
- `GET /api/import/template/transactions`
- `GET /api/import/template/accounts`
- `GET /api/import/template/investments`

### Transactions CSV columns

| Column | Required | Example |
|---|---|---|
| `date` | ✅ | `2024-01-15` (YYYY-MM-DD) |
| `amount` | ✅ | `500.00` |
| `type` | ✅ | `expense` or `income` |
| `category` | — | `Food & Dining` |
| `account` | — | `HDFC Savings` |
| `note` | — | `Lunch with team` |
| `subcategory` | — | `Restaurant` |

### Bank Accounts CSV columns

`name, bank_name, account_type, current_balance, minimum_balance`

`account_type` values: `savings`, `current`, `wallet`, `credit`

### Investments CSV columns

`platform, instrument_name, amount_invested, units, date_invested, current_value, notes`

---

## Ollama AI Integration

1. [Install Ollama](https://ollama.ai) on your machine
2. Start the server: `ollama serve`
3. Pull a model: `ollama pull llama3` (or `mistral`, `gemma2`, `phi3`, etc.)
4. In FinTrack → **Settings**, set:
   - **Ollama URL**: `http://localhost:11434` (default)
   - **Model name**: `llama3`
5. Go to **AI Insights** and start chatting

> The AI receives only an **aggregated summary** (total balance, category totals, P&L) — not raw transaction data. Nothing leaves your machine.

If Ollama isn't running, the AI Insights page shows a friendly "not connected" banner and the rest of the app works normally.

---

## Docker (optional)

```bash
# Build & run
docker compose up --build

# Access at http://localhost:8000
# The finance.db is volume-mounted so data persists
```

---

## Default Categories (seeded)

Food & Dining · Rent & Housing · Transport · Shopping · Bills & Utilities ·
Entertainment · Health · Investments · Education · Misc · Income · Salary

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FINTRACK_DB` | `./finance.db` | Path to SQLite database file |

---

## License

MIT — Use freely, modify as needed. Your data stays yours.
