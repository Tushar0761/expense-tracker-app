# Expense Tracker - Architecture

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, TanStack Query v5, shadcn/ui, Tailwind CSS v4
- **Backend**: NestJS v11, Prisma ORM, MySQL, class-validator
- **Routes**: React Router v7
- **Forms**: React Hook Form + Zod

## Project Structure

```
expense-tracker-app/
├── backend/
│   ├── src/
│   │   ├── accounts/        # Account CRUD, balance updates
│   │   ├── categories/     # Category CRUD with hierarchy
│   │   ├── expenses/       # Expense CRUD, summaries, KPIs
│   │   ├── loans/          # Loans, EMI, future payments
│   │   ├── transfers/     # Account transfers
│   │   ├── prisma/         # Database schema
│   │   └── main.ts
│   └── prisma/
│       └── schema.prisma   # Database schema
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── lib/           # API calls, utilities
│   │   └── App.tsx
│   └── package.json
└── docs/                  # Documentation
```

## Database Schema

### Tables:
1. **category_master** - Self-referential hierarchy (parentId)
2. **account_master** - CASH/BANK/CREDIT with balance
3. **expenses_data_master** - Expense records (single category)
4. **transfer_data_master** - Inter-account transfers
5. **borrower_master** - Loan borrowers
6. **loans_master** - Loan records
7. **emi_payment_data** - EMI repayments
8. **future_payment_data_master** - Planned payments

### Key Relationships:
- Expenses → Category (1:1 via categoryId - NOT NULL)
- Loans → Borrower (1:N)
- EMI/Future Payments → Loan (1:N)
- Transfers affect both from/to account balances

## Balance System

### Account Balance (MANUAL - NOT AUTO-CALCULATED):
- User manually sets current balance
- Expenses/transfers do NOT auto-update balance
- Only manual update via Edit Account dialog

### Prisma Relations:
- `expenses_data_master` → `category_master` (NOT `category`)
- `expenses_data_master` → `account`

## Frontend Pages:
- `/` - Dashboard (KPIs, charts, recent transactions)
- `/expenses` - Expense list with filters
- `/categories` - Category management with tree
- `/accounts` - Account cards + transfers
- `/loans` - Loans dashboard with charts

## State Management:
- TanStack React Query for server state
- Query keys follow pattern: `["resource-name"]`, `["resource-name", id]`
- Mutations invalidate related queries + show Sonner toasts
