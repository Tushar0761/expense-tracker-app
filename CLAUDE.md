# Expense Tracker App

Personal finance tracker for managing expenses, accounts, categories, loans, and transfers.

## Stack

- **Backend**: NestJS + Prisma ORM + MySQL, runs on port 3000
- **OCR Service**: Python FastAPI + Tesseract OCR + scikit-learn classifier, runs on port 8000
- **Frontend**: React + TypeScript + Vite, proxied via `VITE_API_BASE_URL` (defaults to `http://localhost:3000`), OCR via `VITE_OCR_SERVICE_URL` (defaults to `http://localhost:8000`)
- **UI**: Tailwind CSS + shadcn/ui components, Recharts for graphs
- **State/Data fetching**: TanStack Query (`@tanstack/react-query`)
- **Forms**: react-hook-form + zod schemas
- **Database**: MySQL with Prisma (`backend/prisma/schema.prisma`)

## Project Layout

```
expense-tracker-app/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── expenses/         # Expense CRUD, duplicates, bulk ops, summary, dashboard KPIs
│   │   ├── categories/       # Hierarchical categories (up to 3 levels), stats, tree
│   │   ├── accounts/         # Cash / Bank / Credit accounts, balance management
│   │   ├── transfers/        # Account-to-account fund transfers
│   │   ├── loans/            # Loan tracking, EMI payments, future payment planning
│   │   ├── expense-upload/   # Excel bulk upload/download (.xlsx)
│   │   └── prisma/           # PrismaService singleton
│   └── prisma/
│       └── schema.prisma     # Source of truth for DB schema
└── frontend/
    └── src/
        ├── pages/
        │   ├── dashboard/    # Financial overview, KPI cards, trend chart, drill-down pie
        │   ├── expenses/     # Expenses list, duplicate finder, refine/bulk-edit
        │   ├── categories/   # Category management
        │   ├── loans/        # Loans page
        │   └── Accounts.tsx  # Accounts + transfers
        ├── components/
        │   ├── ui/           # shadcn/ui primitives
        │   ├── loans/        # Loan-specific components and forms
        │   ├── layout/       # Navbar
        │   └── ...           # AddExpenseForm, BulkUpload, DrillDownPieChart, KpiCard
        └── lib/
            └── api.ts        # All axios API calls + TypeScript types (single source of truth)
```

## Database Models (Prisma)

| Model | Purpose |
|---|---|
| `expenses_data_master` | Core expense records (date, amount, category, account, userName, remarks) |
| `category_master` | Self-referential hierarchy (level 1–3, parentId) |
| `account_master` | CASH / BANK / CREDIT accounts with balance |
| `transfer_data_master` | Account-to-account transfers |
| `loans_master` | Loan records with borrower, interest rate, status |
| `borrower_master` | Borrower directory |
| `emi_payment_data` | Recorded loan EMI payments |
| `future_payment_data_master` | Planned future loan payments |
| `asset_master` | Asset records (type, quantity, price) |

## API Routes (all prefixed `/api`)

### Expenses (`/api/expenses`)
- `GET /` — paginated list with filters (date, category, account, userName, search, amount range, sort)
- `GET /dashboard` — KPI summary (thisMonth, lastMonth, overall, accounts, recent transactions)
- `GET /summary` — time-series aggregation (day/week/month/year granularity)
- `GET /category-totals` — totals per category for date range
- `GET /duplicates` — find duplicate expenses by date/amount/name criteria
- `GET /suggestions?userName=` — top categories and remarks for a user
- `POST /create` — create single expense
- `POST /bulk-create` — create multiple expenses
- `PUT /:id` — update expense
- `PUT /bulk-update` — bulk update category/remarks for multiple IDs
- `DELETE /:id` — delete expense

### Categories (`/api/categories`)
- `GET /` — list with sub-categories
- `GET /flat` — flat list of all categories
- `GET /tree` — full hierarchy tree
- `GET /leaf` — leaf-level categories only
- `GET /stats` — spending stats per category (supports level/parentId/date filters)
- `GET /hierarchical-totals` — totals rolled up through hierarchy
- `POST /` — create category
- `DELETE /:id` — delete category

### Accounts (`/api/accounts`)
- `GET /` — all accounts
- `POST /` — create account
- `PUT /:id` — update account
- `PUT /:id/balance` — update balance directly
- `DELETE /:id` — delete account

### Transfers (`/api/transfers`)
- `GET /` — all transfers with account names
- `POST /` — create transfer (adjusts both account balances)
- `DELETE /:id` — delete transfer (reverses balance adjustment)

### Loans (`/api/loans`)
- `GET /table` — all loans with paid/remaining amounts
- `GET /graph` — monthly paid vs planned graph data
- `GET /insight` — loan summary stats
- `GET /payments` — all EMI payment records
- `GET /future-payments` — all planned future payments
- `GET /borrowers` — borrower list
- `GET /borrower/:id` — loans for a specific borrower
- `GET /:id/future-payments` — future payments for a loan
- `GET /:id/planning-summary` — loan planning summary
- `POST /create` — create loan
- `POST /add-borrower` — add borrower
- `POST /record-payment` — record EMI payment
- `POST /bulk-future-payments` — bulk create future payment schedule

### Excel Upload (`/api/expense-excel`)
- `GET /template` — download .xlsx template (optionally pre-filled for year/month)
- `POST /upload` — upload and process .xlsx file (returns inserted/updated/deleted/errors)

## Frontend Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | Dashboard | KPI cards, trend bar chart, drill-down pie chart, recent spending |
| `/expenses` | Expenses | Paginated expense table with full filtering |
| `/duplicates` | DuplicateExpenses | Find and resolve duplicate entries |
| `/refine` | RefineExpenses | Bulk-edit category/remarks with user-based suggestions |
| `/categories` | Categories | Category hierarchy management |
| `/accounts` | Accounts | Account management + transfer history |
| `/loans` | LoansPage | Loan tracking, EMI recording, future payment planning |

## Development

```bash
# Backend
cd backend
npm install
npm run start:dev       # runs on :3000 with watch mode

# Frontend
cd frontend
npm install
npm run dev             # runs on :5173 (or similar Vite port)

# OCR Service (Python)
cd ocr-service
pip install -r requirements.txt
cp .env.example .env   # edit TESSERACT_CMD if needed
uvicorn main:app --reload --port 8000
```

Frontend `.env` (create at `frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:3000
VITE_OCR_SERVICE_URL=http://localhost:8000
```

### Tesseract setup (Windows, one-time)
1. Download the installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install it — default path: `C:\Program Files\Tesseract-OCR\tesseract.exe`
3. That path is already set in `ocr-service/.env.example`

### Training the OCR category classifier
After you have some expenses with remarks in the DB, call:
```
POST http://localhost:8000/ocr/train
```
Or add a "Train Model" button anywhere in the frontend using `trainOcrModel()` from `api.ts`.
The model learns to map item names → your categories from your expense history.
Re-train whenever you want to refresh the model with newer data.

## Split Expense Feature
A scissors icon (`ScissorsLineDashed`) appears on hover next to each expense row in `/expenses`.
Clicking it opens `SplitExpenseDialog` which:
1. Shows the original expense (amount, category, date)
2. Lets you add/remove line item rows (remarks + amount + category)
3. Has a "Scan Receipt (OCR)" button — uploads an image to the Python OCR service
4. OCR result pre-fills the rows; ML predictions appear as clickable suggestion chips
5. A balance indicator shows if line items sum equals original (must balance to save)
6. On save: `POST /api/expenses/:id/split` — deletes original, bulk-creates replacements in one DB transaction

Backend: `expenses.service.ts → splitExpense()`, route in `expenses.controller.ts`
Frontend: `SplitExpenseDialog.tsx`, `api.ts → splitExpense()`, `api.ts → scanReceipt()`

## OCR Microservice (`ocr-service/`)
| File | Purpose |
|---|---|
| `main.py` | FastAPI app, 3 endpoints: `/ocr/receipt`, `/ocr/train`, `/ocr/status` |
| `receipt_parser.py` | Regex parser — extracts item+price lines from raw Tesseract text |
| `category_classifier.py` | scikit-learn Naive Bayes classifier, maps item names → category IDs |
| `requirements.txt` | Python dependencies |
| `.env.example` | Config template |

The classifier uses **TF-IDF character n-grams (2–4)** + **Multinomial Naive Bayes**.
Training data = your expense remarks → categoryId, fetched from the NestJS API.
Model is saved to `model_data.json` on disk and loaded on service start.

## Key Patterns

- All API types are defined in [frontend/src/lib/api.ts](frontend/src/lib/api.ts) — add new types here, not scattered across components.
- Backend uses NestJS ValidationPipe with `whitelist: true` and `transform: true` — DTOs must match exactly.
- Category hierarchy is self-referential via `parentId`; expenses always reference a single `categoryId`.
- Account balances are kept in sync: transfers and payments adjust balances atomically in service layer.
- `userName` on expenses is a free-text field used to attribute expenses to a person (useful for shared household tracking).
- Excel upload supports upsert logic (insert new, update existing, delete removed rows) based on row matching.
