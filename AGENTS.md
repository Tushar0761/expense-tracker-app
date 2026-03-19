# Expense Tracker - Agent Configuration

## Project Overview

This is an **Expense Tracker** application with:

- **Backend**: NestJS v11, Prisma ORM, MySQL
- **Frontend**: React 19, Vite, TypeScript, TanStack Query, shadcn/ui, Tailwind CSS v4

## Critical Rules

### 1. ALWAYS Read Documentation First

Before ANY code changes, read relevant docs:

- `docs/architecture.md` - Project structure
- `docs/api-routes.md` - API endpoints
- `docs/db-schema.md` - Database schema
- `docs/coding-rules.md` - Workflow rules

### 2. Code Quality - MANDATORY

After EVERY code change, you MUST run:

```bash
# Backend
cd backend && npm run lint:fix && npm run format && npm run lint && npm run build

# Frontend
cd frontend && npm run lint:fix && npm run format && npm run lint && npm run build
```

Both builds MUST pass. Fix errors immediately.

### 3. Prisma Schema Changes

**NEVER run `npx prisma migrate dev`** - it resets database!

Safe process:

1. Edit `backend/prisma/schema.prisma`
2. Run: `cd backend && npx prisma generate`

### 4. Account Balance System

- Balance is **MANUAL** - user sets directly
- Expenses/transfers do NOT auto-update balance

## Key Files

| Purpose        | Location                       |
| -------------- | ------------------------------ |
| DB Schema      | `backend/prisma/schema.prisma` |
| Backend Routes | `backend/src/*/controllers/`   |
| Frontend API   | `frontend/src/lib/api.ts`      |
| Frontend Pages | `frontend/src/pages/`          |
| Components     | `frontend/src/components/`     |

## Important Notes

- Category hierarchy via `parentId`, show parent in dropdowns
- Expense form needs: category search, date picker with Today/Yesterday
- Update docs if API/schema changes
