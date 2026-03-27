# Expense Tracker Application - Software Architecture Document

**Document Version:** 1.0
**Last Updated:** March 17, 2026
**Project:** Full-Stack Expense & Loan Tracker

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [Backend API Reference](#backend-api-reference)
6. [Frontend Architecture](#frontend-architecture)
7. [Data Flow](#data-flow)
8. [Module Details](#module-details)
9. [Current Implementation Status](#current-implementation-status)
10. [Pending Work - Expense Module](#pending-work---expense-module)
11. [Security Considerations](#security-considerations)
12. [Development Guidelines](#development-guidelines)

---

## 1. Executive Summary

This is a full-stack financial tracking application built with **React 19** (frontend) and **NestJS** (backend), using **MySQL** as the database with **Prisma ORM**. The application enables users to:

- Track daily expenses with categorization
- Manage multiple financial accounts (Cash, Bank, Credit)
- Record inter-account transfers
- Manage loans with EMI tracking and future payment planning
- View comprehensive financial dashboards with KPIs and charts

### Key Features Implemented:
- ✅ **Loan Module** - Complete CRUD, EMI tracking, future payment planning
- ✅ **Accounts Module** - Account management, transfer recording
- ✅ **Dashboard** - Financial KPIs, charts, recent transactions
- ✅ **Categories Module** - Hierarchical category management
- ⚠️ **Expenses Module** - Basic CRUD implemented, UI needs enhancement

---

## 2. Technology Stack

### Frontend
| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 19.x |
| Build Tool | Vite | Latest |
| Language | TypeScript | Latest |
| Routing | React Router | 7.x |
| State Management | TanStack React Query | 5.x |
| Forms | React Hook Form + Zod | Latest |
| UI Components | shadcn/ui (Radix UI) | Latest |
| Styling | Tailwind CSS | 4.x |
| Charts | Recharts | Latest |
| HTTP Client | Axios | Latest |
| Date Handling | date-fns | Latest |
| Notifications | Sonner | Latest |

### Backend
| Layer | Technology | Version |
|-------|------------|---------|
| Framework | NestJS | 11.x |
| Language | TypeScript | Latest |
| Database | MySQL | 8.x |
| ORM | Prisma | Latest |
| Validation | class-validator + class-transformer | Latest |
| Auth (Prepared) | Passport + JWT | Installed, not used |

---

## 3. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │ Components  │  │   React Query + Axios   │ │
│  │  (Routes)   │  │   (UI/UX)   │  │   (State Management)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (NestJS)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Controllers │  │  Services   │  │      DTOs/Validators    │ │
│  │  (Routes)   │  │  (Business) │  │   (Input Validation)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Prisma Service (ORM Layer)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (MySQL)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Tables: category_master, account_master, expenses_data   │  │
│  │          transfer_data_master, loans_master, borrower     │  │
│  │          emi_payment_data, future_payment_data_master     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Module Structure

```
backend/src/
├── prisma/                 # Database ORM layer
│   └── prisma.service.ts
├── accounts/               # Account management module
│   ├── accounts.controller.ts
│   ├── accounts.service.ts
│   ├── accounts.module.ts
│   └── accounts.dto.ts
├── categories/             # Category hierarchy module
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   ├── categories.module.ts
│   └── categories.dto.ts
├── expenses/               # Expense tracking module
│   ├── expenses.controller.ts
│   ├── expenses.service.ts
│   ├── expenses.module.ts
│   └── expenses.dto.ts
├── loans/                  # Loan management module
│   ├── loans.controller.ts
│   ├── loans.service.ts
│   ├── loans.module.ts
│   └── loans.dto.ts
├── transfers/              # Inter-account transfers
│   ├── transfers.controller.ts
│   ├── transfers.service.ts
│   ├── transfers.module.ts
│   └── transfers.dto.ts
├── app.module.ts           # Root module
├── app.controller.ts
├── app.service.ts
└── main.ts                 # Application entry point
```

### Frontend Structure

```
frontend/src/
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── badge.tsx
│   ├── layout/
│   │   └── Navbar.tsx
│   ├── KPICard/
│   │   └── KpiCard.tsx
│   ├── loans/              # Loan-specific components
│   │   ├── LoansTable.tsx
│   │   ├── LoansSummaryCards.tsx
│   │   ├── LoansGraph.tsx
│   │   ├── EmiPaymentsTable.tsx
│   │   ├── FuturePaymentsTable.tsx
│   │   └── forms/          # Loan forms
│   │       ├── CreateLoanForm.tsx
│   │       ├── RecordPaymentForm.tsx
│   │       ├── AddBorrowerDialog.tsx
│   │       └── schema.ts
│   └── AddExpenseForm.tsx
├── pages/
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   ├── expenses/
│   │   └── Expenses.tsx
│   ├── categories/
│   │   └── Categories.tsx
│   ├── loans/
│   │   └── LoansPage.tsx
│   ├── Accounts.tsx
│   ├── NotFound.tsx
│   └── auth/               # Auth pages (stubs)
│       ├── Login.tsx
│       └── SignUp.tsx
├── lib/
│   ├── api.ts              # API client & types
│   └── utils.ts
├── App.tsx                 # Router configuration
└── main.tsx                # Entry point
```

---

## 4. Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│  category_master    │       │   account_master    │
│─────────────────────│       │─────────────────────│
│ id (PK)             │       │ id (PK)             │
│ name                │       │ name                │
│ parentId (FK self)  │       │ type (enum)         │
└─────────────────────┘       │ balance             │
          │                   │ creditLimit         │
          │                   │ createdAt           │
          │                   │ updatedAt           │
          │                   └─────────────────────┘
          │                            │
          │                            │ 1:N
          │                            │
          ▼                            ▼
┌─────────────────────┐       ┌─────────────────────┐
│ expense_category_   │       │ expenses_data_      │
│ mapping             │       │ master              │
│─────────────────────│       │─────────────────────│
│ expenseId (FK)      │       │ id (PK)             │
│ categoryId (FK)     │       │ date                │
│ (Composite PK)      │       │ amount              │
└─────────────────────┘       │ remarks             │
                              │ accountId (FK)      │
                              │ emiPaymentId (FK)   │
                              └─────────────────────┘
                                      │
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │transfer_data_   │ │  emi_payment_   │ │  borrower_      │
        │ master          │ │  data           │ │  master         │
        │─────────────────│ │─────────────────│ │─────────────────│
        │ id (PK)         │ │ id (PK)         │ │ id (PK)         │
        │ date            │ │ loanId (FK)     │ │ borrowerName    │
        │ amount          │ │ paymentDate     │ │ borrowerContact │
        │ fromAccountId   │ │ totalAmount     │ │ createdAt       │
        │ toAccountId     │ │ paymentMethod   │ │ updatedAt       │
        │ remarks         │ │ notes           │ └─────────────────┘
        │ createdAt       │ │ futurePaymentId │         │
        └─────────────────┘ └─────────────────┘         │ 1:N
                    │                 │                  │
                    │                 │                  ▼
                    │                 │          ┌─────────────────┐
                    │                 │          │  loans_master   │
                    │                 │          │─────────────────│
                    │                 └──────────│ id (PK)         │
                    │                            │ borrowerId (FK) │
                    │                            │ initialAmount   │
                    │                            │ interestRate    │
                    │                            │ loanDate        │
                    │                            │ totalAmount     │
                    │                            │ status (enum)   │
                    │                            │ dueDate         │
                    │                            │ notes           │
                    │                            └─────────────────┘
                    │                                    │
                    │                                    │ 1:N
                    │                                    │
                    │                            ┌─────────────────┐
                    │                            │future_payment_  │
                    │                            │data_master      │
                    │                            │─────────────────│
                    │                            │ id (PK)         │
                    │                            │ loanId (FK)     │
                    │                            │ plannedDate     │
                    │                            │ totalAmount     │
                    │                            │ status (enum)   │
                    │                            │ emiPaymentId    │
                    │                            └─────────────────┘
                    │                                    │
                    │                                    │ 1:1
                    │                                    │
                    └────────────────────────────────────┘
                         (linked via futurePaymentId)
```

### Complete Schema Definition (Prisma)

```prisma
// 1. Asset Tracking
asset_master {
  id        Int      @id @default(autoincrement())
  type      String
  name      String
  quantity  Float
  price     Float
  value     Float
  createdAt DateTime @default(now())
}

// 2. Category Hierarchy (Self-referential)
category_master {
  id               Int                        @id
  name             String
  parentId         Int?                       // Parent category (nullable for root)
  parent           category_master?           @relation("category_masterTocategory_master")
  children         category_master[]          // Subcategories
  expenseMappings  expense_category_mapping[] // Many-to-many with expenses
}

// 3. Accounts (Cash, Bank, Credit)
account_master {
  id            Int            @id
  name          String
  type          account_type   // CASH | BANK | CREDIT
  balance       Float          @default(0)
  creditLimit   Float?         @default(0)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @default(now())
  expenses      expenses_data_master[]
  transfersFrom transfer_data_master[]
  transfersTo   transfer_data_master[]
}

// 4. Inter-Account Transfers
transfer_data_master {
  id            Int            @id
  date          DateTime
  amount        Float
  fromAccountId Int            // Source account
  toAccountId   Int            // Destination account
  remarks       String?
  createdAt     DateTime       @default(now())
  fromAccount   account_master @relation("FromAccount")
  toAccount     account_master @relation("ToAccount")
}

// 5. EMI Payments (Loan repayments)
emi_payment_data {
  id              Int                            @id
  loanId          Int                            // Reference to loan
  paymentDate     DateTime
  principalAmount Float
  interestAmount  Float
  totalAmount     Float
  paymentMethod   emi_payment_data_paymentMethod // cash | bank_transfer | upi | cheque | other
  notes           String?
  createdAt       DateTime                       @default(now())
  futurePaymentId Int?                           @unique              // Optional link to planned payment
  loans_master    loans_master                   @relation
  future_payment  future_payment_data_master?    @relation
  expenses        expenses_data_master[]         // Can link expenses to EMI payments
}

// 6. Expenses (Main expense records)
expenses_data_master {
  id           Int                        @id
  date         DateTime
  amount       Float
  remarks      String?
  accountId    Int?                       // Account used for payment
  createdAt    DateTime                   @default(now())
  emiPaymentId Int?                       // Link to EMI if expense is EMI-related
  account      account_master?            @relation
  emi_payment  emi_payment_data?          @relation
  categories   expense_category_mapping[] // Many-to-many with categories
}

// 7. Expense-Category Junction (Many-to-Many)
expense_category_mapping {
  expenseId  Int                  @id
  categoryId Int                  @id
  expense    expenses_data_master @relation
  category   category_master      @relation
}

// 8. Future Payment Planning
future_payment_data_master {
  id         Int                               @id
  loanId     Int                               // Reference to loan
  plannedDate DateTime
  principalAmount Float
  interestAmount  Float
  totalAmount     Float
  status       future_payment_data_master_status // pending | completed | cancelled
  notes        String?
  createdAt    DateTime                          @default(now())
  updatedAt    DateTime?                         @default(now())
  emiPaymentId Int?                              // Link to actual EMI when completed
  emi_payment  emi_payment_data?                 @relation
  loans_master loans_master                      @relation
}

// 9. Loans (Master records)
loans_master {
  id              Int                          @id
  borrowerId      Int?                         // Reference to borrower
  dueDate         DateTime?
  status          loans_master_status          // active | closed | defaulted
  notes           String?
  createdAt       DateTime                     @default(now())
  updatedAt       DateTime                     @default(now())
  initialAmount   Float
  interestRate    Float
  loanDate        DateTime                     @db.Date
  totalAmount     Float
  emi_payments    emi_payment_data[]
  future_payments future_payment_data_master[]
  borrower        borrower_master?             @relation
}

// 10. Borrowers (Loan recipients)
borrower_master {
  id            Int            @id
  borrowerName  String
  borrowerContact String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @default(now())
  loans         loans_master[]
}
```

### Enums Defined

```prisma
enum account_type {
  CASH
  BANK
  CREDIT
}

enum loans_master_status {
  active
  closed
  defaulted
}

enum emi_payment_data_paymentMethod {
  cash
  bank_transfer
  upi
  cheque
  other
}

enum future_payment_data_master_status {
  pending
  completed
  cancelled
}
```

---

## 5. Backend API Reference

### Base URL
```
http://localhost:3000/api
```

### CORS Configuration
- Allowed Origins: `localhost` only (development)
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Headers: Content-Type, Authorization, Accept
- Credentials: Enabled

---

### Categories Module

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/categories/create` | Create category | `{ name: string, parentId?: number }` | CategoryFlat |
| GET | `/categories` | Get all categories with subcategories | - | CategoryWithSubs[] |
| GET | `/categories/flat` | Get flat list of all categories | - | CategoryFlat[] |
| GET | `/categories/:id/subcategories` | Get subcategories for parent | - | SubCategory[] |
| DELETE | `/categories/:id` | Delete category | - | void |

**DTOs:**
```typescript
CreateCategoryDto {
  name: string
  parentId?: number
}
```

---

### Accounts Module

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/accounts` | Create account | CreateAccountDto | Account |
| GET | `/accounts` | List all accounts | - | Account[] |
| GET | `/accounts/:id` | Get single account | - | Account |
| PUT | `/accounts/:id` | Update account | UpdateAccountDto | Account |
| DELETE | `/accounts/:id` | Delete account | - | void |

**DTOs:**
```typescript
CreateAccountDto {
  name: string
  type: 'CASH' | 'BANK' | 'CREDIT'
  balance?: number
  creditLimit?: number
}

UpdateAccountDto {
  name?: string
  type?: 'CASH' | 'BANK' | 'CREDIT'
  balance?: number
  creditLimit?: number
}
```

---

### Transfers Module

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/transfers` | Create transfer (updates balances) | CreateTransferDto | Transfer |
| GET | `/transfers` | List all transfers | - | Transfer[] |
| DELETE | `/transfers/:id` | Delete transfer (reverts balances) | - | void |

**DTOs:**
```typescript
CreateTransferDto {
  date: string         // yyyy-MM-dd
  amount: number
  fromAccountId: number
  toAccountId: number
  remarks?: string
}
```

---

### Expenses Module

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/expenses/create` | Create expense | CreateExpenseDto | ExpenseRow |
| GET | `/expenses` | Get paginated expenses with filters | Query Params | ExpenseListResponse |
| GET | `/expenses/:id` | Get single expense | - | ExpenseRow |
| PUT | `/expenses/:id` | Update expense | UpdateExpenseDto | ExpenseRow |
| DELETE | `/expenses/:id` | Delete expense (reverts balance) | - | void |
| GET | `/expenses/summary` | Get expense summary by granularity | Query Params | ExpenseSummaryPoint[] |
| GET | `/expenses/category-totals` | Get category-wise totals | Query Params | CategoryTotal[] |
| GET | `/expenses/dashboard` | Get dashboard KPIs | - | DashboardKPIs |

**Query Params for GET /expenses:**
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `startDate`: string (ISO date)
- `endDate`: string (ISO date)
- `categoryId`: number
- `accountId`: number
- `search`: string (searches remarks)

**Query Params for GET /expenses/summary:**
- `granularity`: 'day' | 'week' | 'month' | 'year'
- `startDate`: string
- `endDate`: string

**DTOs:**
```typescript
CreateExpenseDto {
  date: string         // yyyy-MM-dd
  amount: number
  remarks?: string
  accountId: number
  categoryIds: number[]
  emiPaymentId?: number
}

UpdateExpenseDto {
  date?: string
  amount?: number
  remarks?: string
  accountId?: number
  categoryIds?: number[]
  emiPaymentId?: number
}
```

---

### Loans Module

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/loans/create` | Create new loan | CreateLoanDto | Loan |
| POST | `/loans/add-borrower` | Add new borrower | `{ borrowerName: string }` | Borrower |
| POST | `/loans/record-payment` | Record EMI payment | RecordPaymentDto | EMI Record |
| POST | `/loans/bulk-future-payments` | Bulk create future payments | BulkCreateFuturePaymentDto | `{ count: number }` |
| GET | `/loans/insight` | Get loans insight (paid, pending, interest) | - | InsightData |
| GET | `/loans/graph` | Get 24-month graph data (paid vs planned) | - | LoanGraphPoint[] |
| GET | `/loans/table` | Get loans summary table | - | LoanTableRow[] |
| GET | `/loans/payments` | Get recent EMI payments (last 3 months) | - | EmiPaymentRow[] |
| GET | `/loans/future-payments` | Get upcoming planned payments | - | FuturePaymentRow[] |
| GET | `/loans/borrowers` | Get all borrowers | - | Borrower[] |
| GET | `/loans/borrower/:borrowerId` | Get loans by borrower | - | LoanTableRow[] |
| GET | `/loans/:loanId/future-payments` | Get future payments for loan | - | FuturePaymentRow[] |
| GET | `/loans/:loanId/planning-summary` | Get loan planning summary | - | LoanPlanningSummary |

**DTOs:**
```typescript
CreateLoanDto {
  borrowerId: number
  status: 'active' | 'closed' | 'defaulted'
  initialAmount: number
  interestRate: number
  loanDate: string        // yyyy-MM-dd
  totalAmount: number
  dueDate?: string        // yyyy-MM-dd
  notes?: string
}

RecordPaymentDto {
  loanId: number
  paymentDate: string     // yyyy-MM-dd
  totalAmount: number
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other'
  futurePaymentId?: number
  notes?: string
  principalAmount?: number
  interestAmount?: number
}

FuturePaymentItemDto {
  plannedDate: string     // yyyy-MM-dd
  totalAmount: number
  principalAmount?: number
  interestAmount?: number
}

BulkCreateFuturePaymentDto {
  loanId: number
  items: FuturePaymentItemDto[]
}
```

---

## 6. Frontend Architecture

### Routing Structure

```
/                    → Dashboard
/expenses            → Expenses Page
/categories          → Categories Page
/accounts            → Accounts & Transfers Page
/loans               → Loans Management Page
/login               → Login (stub)
/signup              → Signup (stub)
*                    → 404 Not Found
```

### State Management Pattern

**TanStack React Query (v5)** is used for server state management:

```typescript
// Query Keys Structure
["dashboard-kpis"]           // Dashboard KPIs
["expenses", queryParams]    // Expenses list with filters
["categories"]               // Categories with subcategories
["categories-flat"]          // Flat category list
["accounts"]                 // All accounts
["transfers"]                // All transfers
["loans-insight-data"]       // Loans insight
["loans-table"]              // Loans table data
["loans-graph"]              // Loans graph data
["loans-borrowers"]          // Borrowers list
["expenses-summary-monthly"] // Monthly expense summary
["category-totals"]          // Category totals
```

**Mutation Pattern:**
```typescript
const mutation = useMutation({
  mutationFn: (payload) => createExpense(payload),
  onSuccess: () => {
    toast.success("Expense added");
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  },
  onError: (error: Error) => {
    toast.error(`Error: ${error.message}`);
  },
});
```

### Component Hierarchy

```
App (Router)
├── Navbar (Global Navigation)
├── Dashboard
│   ├── KpiCard (×4)
│   ├── BarChart (Monthly Trends)
│   ├── PieChart (Category Distribution)
│   └── Recent Transactions Table
├── Expenses
│   ├── Filter Card
│   ├── KPI Cards (Total, Top Categories)
│   ├── Expenses Table
│   │   └── Action Buttons (Edit, Delete)
│   └── AddExpenseForm (Modal)
│       └── Add Category Dialog
├── Categories
│   └── (Category management UI)
├── Accounts
│   ├── Summary Card
│   ├── Account List
│   ├── Transfer Dialog
│   ├── Add Account Dialog
│   └── Transfer History Table
└── Loans
    ├── Action Buttons (Create Loan, Record Payment)
    ├── LoansSummaryCards
    ├── BarChart (Loans Over Time)
    ├── PieChart (Loan Distribution)
    ├── LoansTable
    ├── EmiPaymentsTable
    └── FuturePaymentsTable
```

### UI Component Library (shadcn/ui)

**Core Components:**
- Button (variants: default, outline, ghost, etc.)
- Card (header, content structure)
- Dialog (modal dialogs)
- Input (text, date, number)
- Label (form labels)
- Select (dropdowns)
- Table (data tables)
- Badge (tags/labels)

---

## 7. Data Flow

### Create Expense Flow

```
User → Add Expense Button
  │
  ▼
AddExpenseForm Dialog Opens
  │
  ├─→ fetchCategoriesFlat() → Populate category badges
  └─→ fetchAccounts() → Populate account dropdown
  │
  ▼
User fills form (date, amount, account, categories, remarks)
  │
  ▼
React Hook Form validates (Zod schema)
  │
  ▼
createExpenseMutation.mutate(payload)
  │
  ├─→ POST /api/expenses/create
  │     │
  │     ▼
  │   ExpensesService.createExpense()
  │     │
  │     ▼
  │   Prisma Transaction:
  │     1. Create expenses_data_master record
  │     2. Create expense_category_mapping records
  │     3. Update account_master.balance (decrement)
  │
  ▼
Success Toast + Invalidate Queries:
  ["expenses"], ["dashboard-kpis"], ["accounts"]
  │
  ▼
UI Auto-refreshes with new data
```

### Record Loan Payment Flow

```
User → Record Payment Button
  │
  ▼
RecordPaymentForm Dialog Opens
  │
  ▼
User fills form (loan, date, amount, method, optional future payment link)
  │
  ▼
recordPaymentMutation.mutate(payload)
  │
  ├─→ POST /api/loans/record-payment
  │     │
  │     ▼
  │   LoansService.recordPaymentService()
  │     │
  │     ▼
  │   Prisma Transaction:
  │     1. Create emi_payment_data record
  │     2. If futurePaymentId provided:
  │        - Update future_payment_data_master.status = 'completed'
  │        - Link emiPaymentId
  │
  ▼
Success Toast + Invalidate Queries
  │
  ▼
EmiPaymentsTable & FuturePaymentsTable refresh
```

### Transfer Money Flow

```
User → Transfer Money Button
  │
  ▼
Transfer Dialog Opens
  │
  ▼
User fills form (from, to, amount, remarks)
  │
  ▼
createTransferMutation.mutate(payload)
  │
  ├─→ POST /api/transfers
  │     │
  │     ▼
  │   TransfersService.create()
  │     │
  │     ▼
  │   Prisma Transaction:
  │     1. Create transfer_data_master record
  │     2. fromAccount.balance -= amount (decrement)
  │     3. toAccount.balance += amount (increment)
  │
  ▼
Success Toast + Invalidate Queries:
  ["accounts"], ["transfers"]
  │
  ▼
Account balances & transfer history refresh
```

---

## 8. Module Details

### 8.1 Loans Module (Complete)

**Purpose:** Manage personal loans given to borrowers with EMI tracking and future payment planning.

**Key Features:**
- Create borrowers
- Create loans with interest rates
- Record EMI payments (with principal/interest breakdown)
- Plan future payments (bulk creation support)
- Link actual payments to planned payments
- Dashboard with:
  - Summary cards (total principal, interest, paid, pending)
  - 24-month bar chart (paid vs planned)
  - Pie chart (loan distribution by borrower)
  - Loans table (aggregated by borrower)
  - Recent EMI payments table
  - Upcoming future payments table

**Business Logic:**
- `getInsightData()`: Aggregates total principal, interest, and paid amount across all loans
- `getGraphData()`: Returns 24-month series with actual paid vs planned amounts per month
- `getTableData()`: SQL query aggregating loans by borrower with paid/remaining calculations
- `recordPaymentService()`: Transaction that creates EMI record and optionally marks future payment as completed

---

### 8.2 Expenses Module (Basic Implementation)

**Purpose:** Track daily expenses with categorization and account linkage.

**Current Implementation:**
- Create expenses with date, amount, account, categories, remarks
- Edit existing expenses (with balance adjustment logic)
- Delete expenses (reverts account balance)
- Paginated list view with filters (date range, category, account, search)
- Dashboard KPIs (this month, last month, overall, top category)
- Category-wise totals
- Monthly expense summary for charts

**Expense Update Logic:**
When updating an expense, the service:
1. Reverts the old account balance (adds back the old amount)
2. Applies the new amount to the (potentially different) account
3. Deletes old category mappings if categories changed
4. Updates the expense record

---

### 8.3 Accounts Module (Complete)

**Purpose:** Manage financial accounts and track inter-account transfers.

**Features:**
- Create accounts (Cash, Bank, Credit types)
- View all accounts with balances
- Update account details
- Delete accounts
- Record transfers between accounts
- View transfer history
- Auto-balance updates on transfer creation/deletion

**Account Types:**
- **CASH**: Physical cash/wallet
- **BANK**: Bank accounts
- **CREDIT**: Credit cards (balance shown as negative in UI)

---

### 8.4 Categories Module (Complete)

**Purpose:** Hierarchical expense categorization system.

**Features:**
- Create parent categories
- Create subcategories (children)
- View categories with nested subcategories
- Flat view for form dropdowns
- Delete categories

**Structure:**
```
Root Categories (parentId = null)
├── Food & Dining
│   ├── Groceries
│   ├── Restaurants
│   └── Swiggy/Zomato
├── Transportation
│   ├── Fuel
│   ├── Public Transport
│   └── Maintenance
└── Entertainment
    ├── Movies
    └── Subscriptions
```

---

### 8.5 Dashboard (Complete)

**Purpose:** Financial overview at a glance.

**KPIs Displayed:**
1. **Net Liquidity**: Sum of all account balances (credit cards subtracted)
2. **Individual Account Cards**: Each account with type icon and balance
3. **Spending This Month**: Total + transaction count
4. **Month-over-Month Change**: Percentage increase/decrease
5. **All-Time Expenses**: Lifetime total
6. **Top Budget Burner**: Highest spending category

**Visualizations:**
- Bar chart: 12-month expense trend
- Pie chart: Category distribution (top 4 shown in legend)
- Table: Recent 10 transactions

---

## 9. Current Implementation Status

### ✅ Completed Modules

| Module | Backend | Frontend | Status |
|--------|---------|----------|--------|
| Loans | ✅ Complete | ✅ Complete | Production Ready |
| Accounts | ✅ Complete | ✅ Complete | Production Ready |
| Transfers | ✅ Complete | ✅ Complete | Production Ready |
| Categories | ✅ Complete | ⚠️ Basic | Needs UI enhancement |
| Dashboard | ✅ Complete | ✅ Complete | Production Ready |
| Expenses | ✅ Complete | ⚠️ Basic | Functional but needs enhancement |

### ⚠️ Pending/Stub Components

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ❌ Not Started | Login/Signup pages are empty stubs |
| User Management | ❌ Not Started | No user model in database |
| Asset Module | ⚠️ Schema Only | Backend & frontend not implemented |
| Categories Page | ⚠️ Basic UI | Needs full implementation |

---

## 10. Pending Work - Expense Module

### Current State
The expense module has:
- ✅ Full backend CRUD operations
- ✅ Database transactions for balance management
- ✅ Category many-to-many relationships
- ✅ Pagination and filtering API
- ✅ Basic frontend list view with filters
- ✅ Add/Edit expense modal form

### Areas Needing Enhancement

#### 1. **Expense Analysis Page**
Create a dedicated analysis view with:
- Spending trends by week/day
- Category breakdown pie/donut chart
- Account-wise spending distribution
- Month-over-month comparison
- Budget vs actual tracking (if budgets implemented)

#### 2. **Budget Management** (New Feature)
Consider adding:
- Monthly budget limits per category
- Budget alerts/notifications
- Budget vs actual visualization

#### 3. **Recurring Expenses** (New Feature)
Add support for:
- Marking expenses as recurring
- Auto-creation of recurring entries
- Subscription tracking

#### 4. **Export Functionality**
Add options to:
- Export expenses to CSV/Excel
- Print-friendly view
- Date range reports

#### 5. **Enhanced Filtering**
Add filters for:
- Amount range (min-max)
- Payment method
- Multiple category selection
- Tag-based filtering

---

## 11. Security Considerations

### Current State
⚠️ **No authentication or authorization is implemented.**

All endpoints are publicly accessible (CORS restricted to localhost only).

### Recommended Security Implementation

#### 1. **Authentication (JWT)**
```typescript
// Packages already installed but not used:
- @nestjs/jwt
- passport
- passport-jwt

// Implementation needed:
- AuthModule with JwtStrategy
- User entity in Prisma schema
- Login/Signup endpoints
- JWT token issuance and refresh
- Frontend auth pages with form handling
- Token storage (httpOnly cookie or secure storage)
```

#### 2. **Authorization Guards**
```typescript
// Protect all routes with:
@UseGuards(JwtAuthGuard)

// Optional role-based access:
@UseGuards(RolesGuard)
@Roles('admin')
```

#### 3. **Input Validation**
✅ Already implemented via `class-validator` and global validation pipe.

#### 4. **SQL Injection Prevention**
✅ Prisma ORM provides parameterized queries by default.

#### 5. **XSS Prevention**
✅ React auto-escapes output; no innerHTML usage found.

#### 6. **CORS**
✅ Restricted to localhost in development. Production should be configured per deployment.

---

## 12. Development Guidelines

### Code Style

#### Backend
- Use DTOs for all request/response validation
- Services contain business logic; controllers handle HTTP
- Use Prisma transactions for multi-step database operations
- Proper error handling with HTTP status codes

#### Frontend
- Use React Query for server state
- React Hook Form + Zod for form validation
- Sonner for toast notifications
- Consistent component structure (Card, Header, Content pattern)

### Git Workflow
```
main branch (production)
  └── Feature branches: feature/loans, feature/expenses, etc.
```

### Running the Application

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
# Server runs on http://localhost:3000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### Environment Variables

**Backend (.env):**
```
DATABASE_URL="mysql://user:password@localhost:3306/expense_tracker"
PORT=3000
```

**Frontend (.env):**
```
VITE_API_BASE_URL=http://localhost:3000
```

---

## Appendix A: API Response Types

### DashboardKPIs
```typescript
{
  thisMonth: { total: number; count: number };
  lastMonth: { total: number; count: number };
  overall: { total: number; count: number };
  accounts: { id: number; name: string; type: string; balance: number }[];
  recentTransactions: {
    id: number;
    date: string;
    amount: number;
    remarks: string | null;
    categories: string[];
  }[];
}
```

### LoanPlanningSummary
```typescript
{
  totalAmount: number;
  paidAmount: number;
  plannedAmount: number;
  unplannedAmount: number;
  loanId: number;
  notes: string | null;
  loanDate: string;
}
```

---

## Appendix B: File Quick Reference

### Key Backend Files
| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | Database schema |
| `backend/src/main.ts` | App entry point, CORS, validation pipe |
| `backend/src/app.module.ts` | Root module importing feature modules |
| `backend/src/expenses/expenses.service.ts` | Expense business logic |
| `backend/src/loans/loans.service.ts` | Loan business logic |

### Key Frontend Files
| File | Purpose |
|------|---------|
| `frontend/src/App.tsx` | Router configuration |
| `frontend/src/lib/api.ts` | API client, types, fetch functions |
| `frontend/src/pages/dashboard/Dashboard.tsx` | Dashboard page |
| `frontend/src/pages/expenses/Expenses.tsx` | Expenses page |
| `frontend/src/pages/loans/LoansPage.tsx` | Loans page |
| `frontend/src/components/AddExpenseForm.tsx` | Expense form modal |

---

**End of Document**
