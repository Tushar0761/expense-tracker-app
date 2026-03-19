# Coding Rules & Workflow

## MANDATORY: Before Any Code Change

### 1. Read Documentation First
- Always read relevant docs in `/docs` before making changes
- Understand the current architecture and API structure
- Check `db-schema.md` for database relationships

### 2. Prisma Schema Changes - CRITICAL RULE

**NEVER run `npx prisma migrate dev`** - it resets the database and causes data loss!

**Safe Schema Update Process:**
1. Make changes in `backend/prisma/schema.prisma`
2. Run: `npx prisma generate`
3. If new table/column: create migration manually or use `npx prisma db push`
4. Update relevant service/controller files

### 3. Prisma Relation Names - CRITICAL

**Always use the exact relation name from schema.prisma in include statements!**

For `expenses_data_master` model:
- Schema defines: `category_master` relation
- Schema defines: `account` relation

**CORRECT:**
```typescript
include: {
  category_master: true,  // ✅ Match schema exactly
  account: true,          // ✅ Match schema exactly
}
```

**INCORRECT (will cause runtime error):**
```typescript
include: {
  category: true,         // ❌ Wrong name
}
```

After any schema change, always run: `cd backend && npx prisma generate`

---

## Code Quality Checks - MANDATORY

### Backend
```bash
cd backend
npm run lint      # ESLint check
npm run build     # TypeScript build
```

### Frontend
```bash
cd frontend
npm run lint      # ESLint check
npm run build     # TypeScript + Vite build
```

**Rule: Both builds must pass before completing any task.**

---

## Development Workflow

### 1. Make Changes
- Update relevant files (backend/frontend/docs)
- Follow existing code patterns

### 2. Run Quality Checks
```bash
# Backend
cd backend && npm run lint && npm run build

# Frontend  
cd frontend && npm run lint && npm run build
```

### 3. Fix Any Errors
- ESLint errors → fix or discuss with user
- TypeScript errors → fix immediately
- Build failures → fix before proceeding

### 4. Document Changes
- Update relevant docs in `/docs` if API/schema changed
- Update this file if workflow changes

---

## Code Style Guidelines

### Backend (NestJS)
- Use `class-validator` for DTO validation
- Use `PrismaService` for database operations
- Follow REST conventions for endpoints
- Use transactions for multi-step operations

### Frontend (React)
- Use TanStack Query for server state
- Use React Hook Form + Zod for forms
- Use shadcn/ui components
- Use Sonner for toasts

### TypeScript
- Avoid `any` - use proper types
- Define interfaces/types in shared location
- Keep API types in `/lib/api.ts`

---

## Important Project Details

### Account Balance System
- Balance is **MANUAL** - user sets it directly
- Expenses/transfers do NOT auto-update balance
- Use `PUT /accounts/:id/balance` to update manually

### Category Hierarchy
- Self-referential via `parentId`
- Backend returns `parentName` for display
- Show parent name in dropdowns: "Child (Parent)"

### Expense Form Requirements
- Category dropdown with search
- Date picker with Today/Yesterday buttons
- Parent category shown in options

---

## File Locations

| Purpose | Location |
|---------|----------|
| Backend routes | `backend/src/*/controllers/` |
| Backend services | `backend/src/*/services/` |
| Frontend API | `frontend/src/lib/api.ts` |
| Frontend pages | `frontend/src/pages/` |
| Frontend components | `frontend/src/components/` |
| DB Schema | `backend/prisma/schema.prisma` |

---

## Testing Changes

After any code change:
1. Run lint + build for both backend and frontend
2. If there are runtime errors, check console
3. Verify the feature works as expected
4. Update docs if API changed
