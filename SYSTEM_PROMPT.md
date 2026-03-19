# SYSTEM PROMPT - Expense Tracker App

## Project Context
You are helping develop an Expense Tracker application with:
- **Backend**: NestJS v11, Prisma ORM, MySQL
- **Frontend**: React 19, Vite, TypeScript, TanStack Query, shadcn/ui

## CRITICAL RULES

### 1. Documentation First
Before making ANY changes, ALWAYS read the relevant docs:
- `/docs/architecture.md` - Project structure, tech stack
- `/docs/api-routes.md` - All API endpoints
- `/docs/db-schema.md` - Database tables and relationships
- `/docs/coding-rules.md` - Workflow and quality checks

### 2. Code Quality - MANDATORY
After EVERY code change, you MUST run:

**Backend:**
```bash
cd backend && npm run lint && npm run build
```

**Frontend:**
```bash
cd frontend && npm run lint && npm run build
```

Both builds MUST pass. Fix errors immediately.

### 3. Prisma Schema Changes - CRITICAL
**NEVER** run `npx prisma migrate dev` - it resets the database!

Safe process:
1. Edit `backend/prisma/schema.prisma`
2. Run: `npx prisma generate`
3. Test the changes

### 4. Account Balance System
- Balance is **MANUAL** - user sets it directly
- Expenses/transfers do NOT auto-update balance
- Only manual update via Edit Account dialog
- After any schema change: run `cd backend && npx prisma generate`

## PRISMA RELATION NAMING - IMPORTANT
**The Prisma relation name in include statements MUST match the schema exactly.**

For `expenses_data_master` model:
- Schema uses: `category_master` (NOT `category`)
- Schema uses: `account` (NOT `account_master`)

**Always use the relation name from schema.prisma, not an alias!**

Example (CORRECT):
```typescript
include: {
  category_master: true,  // ✅ Correct
  account: true,         // ✅ Correct
}
```

Example (INCORRECT):
```typescript
include: {
  category: true,         // ❌ Wrong - will cause runtime error
}
```

## Project Architecture

```
expense-tracker-app/
├── backend/
│   ├── src/
│   │   ├── accounts/      # Account CRUD, balance updates
│   │   ├── categories/    # Category CRUD with hierarchy
│   │   ├── expenses/       # Expense CRUD, summaries
│   │   ├── loans/         # Loans, EMI, future payments
│   │   └── transfers/     # Account transfers
│   └── prisma/schema.prisma
├── frontend/
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   └── lib/api.ts    # API calls
└── docs/                  # Documentation
```

## Key Patterns

### Backend
- Use `class-validator` for DTO validation
- Use `PrismaService` for database
- Use transactions for multi-step operations
- Return proper HTTP status codes
- **Always match relation names from schema.prisma in include statements**

### Frontend
- Use TanStack Query for server state
- Use React Hook Form + Zod for forms
- Use Sonner for toasts
- Invalidate queries after mutations

## Important Notes

1. Category hierarchy uses self-referential `parentId`
2. Show parent name in category dropdowns: "Child (Parent)"
3. Expense form needs: category search, date picker with Today/Yesterday buttons
4. Update docs if API/schema changes

## File Locations
| Purpose | Path |
|---------|------|
| DB Schema | `backend/prisma/schema.prisma` |
| Backend Routes | `backend/src/*/controllers/*.ts` |
| Frontend API | `frontend/src/lib/api.ts` |
| Docs | `docs/*.md` |

## CHANGELOG - Important Fixes

### 2026-03-18: Prisma Relation Fix
**Problem**: Code used `category: true` but schema defines relation as `category_master`.

**Files Fixed**:
- `backend/src/expenses/expenses.service.ts` - 5 occurrences fixed

**Lesson Learned**: Always use the exact relation name from `schema.prisma` in include statements.

### 2026-03-18: Manual Balance System
**Change**: Removed automatic balance updates from expenses and transfers.

**Files Changed**:
- `backend/src/expenses/expenses.service.ts` - Removed balance update logic from updateExpense/deleteExpense
- `backend/src/transfers/transfers.service.ts` - Removed auto balance updates
- `backend/prisma/schema.prisma` - Removed account_balance_adjustment table

**Rule**: Balance is manual. User sets it directly. Transactions do NOT affect balance.
