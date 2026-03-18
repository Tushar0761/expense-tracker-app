# Expense Tracker Architecture

## CRITICAL MIGRATION RULE
When working with database schema changes in this project:
- DO NOT run `npx prisma migrate dev` directly - it resets the database and causes data loss
- Instead:
  1. Save current schema to schemaOld.prisma for comparison
  2. Make your schema changes in schema.prisma
  3. Create a temporary schemaNew.prisma with your changes
  4. Run: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schemaNew.prisma --script > migration.sql`
  5. Review the SQL manually and apply changes directly to database if needed
  6. Run `npx prisma generate` to update client
- This prevents accidental data loss from database resets

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, TanStack Query v5, shadcn/ui, Tailwind CSS v4, Recharts
- **Backend**: NestJS v11, Prisma ORM, MySQL, class-validator
- **Routes**: React Router v7
- **Forms**: React Hook Form + Zod

## Database Schema (MySQL via Prisma)

### Core Tables:
1. **category_master** - Self-referential hierarchy (parentId) - tree structure
2. **account_master** - CASH/BANK/CREDIT types with balance tracking
3. **expenses_data_master** - Main expense records, single category (categoryId NOT NULL)
4. **transfer_data_master** - Inter-account transfers (fromAccountId, toAccountId)
5. **borrower_master** - Loan borrowers
6. **loans_master** - Loan records with initialAmount, interestRate, totalAmount, status
7. **emi_payment_data** - EMI repayments linked to loans
8. **future_payment_data_master** - Planned payments (pending/completed/cancelled)
9. **asset_master** - Asset tracking (schema only)
10. **account_balance_adjustment** - Manual balance adjustments with audit trail

### Key Relationships:
- Expenses → Category (1:1 via categoryId - NOT NULL)
- Loans → Borrower (1:N)
- EMI/Future Payments → Loan (1:N)
- EMI ↔ Future Payment (1:1 optional link)
- Transfers affect both from/to account balances
- Account balance includes adjustments for manual corrections

### Balance Calculation Formula:
Account Balance = sum of transfers in - sum of transfers out - sum of expenses + sum of adjustments

## API Structure (Base: /api)

### Modules:
- **/categories** - CRUD with hierarchy support
- **/accounts** - CRUD for CASH/BANK/CREDIT accounts + adjustment endpoint
- **/transfers** - Create/delete transfers (auto balance updates)
- **/expenses** - CRUD, summary, category-totals, dashboard KPIs
- **/loans** - Create, record-payment, bulk-future-payments, insight, graph, table, borrowers

## Account Balance Adjustment
- Endpoint: POST /accounts/:id/adjust-balance
- Body: { amount: number, reason: string }
- Amount can be positive (add) or negative (subtract)
- Creates audit trail entry in account_balance_adjustment table

## Frontend Pages:
- `/` - Dashboard (KPIs, charts, recent transactions)
- `/expenses` - Expense list with filters, pagination, single category select
- `/categories` - Category management with tree view
- `/accounts` - Account cards + transfer history + edit balance
- `/loans` - Loans dashboard with charts, EMI table, future payments

## State Management:
- TanStack React Query for server state
- Query keys: ["dashboard-kpis"], ["expenses"], ["categories-flat"], ["accounts"], ["loans-*"]
- Mutations invalidate related queries + show Sonner toasts

## Implementation Status:
- ✅ Loans module - Complete
- ✅ Accounts/Transfers - Complete
- ✅ Dashboard - Complete
- ✅ Categories backend - Complete
- ✅ Expenses - Single category (1:1), no M:N mapping
- ✅ Account balance adjustment - Implemented
- ❌ Authentication - Not started (passport-jwt installed but unused)
- ❌ Asset module - Schema only

## Key Patterns:
- All balance updates use Prisma transactions
- Expense update/delete reverts old account balance
- Transfer create/delete updates both account balances
- EMI payment can optionally link to future payment (marks as completed)
- Manual balance adjustments create audit trail entries
- Category totals aggregate with hierarchical summing (parent = sum of children + own)

## Category Hierarchical Aggregation:
When calculating category totals:
1. Fetch all categories with parentId relationships
2. Build tree in memory
3. Calculate direct totals per category from expenses
4. Recursively sum child totals into parent
5. This ensures parent category total = its expenses + all descendant expenses