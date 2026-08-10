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
cd backend && npm run lint:fix && npm run format && npm run lint && npm run build
```

**Frontend:**
```bash
cd frontend && npm run lint:fix && npm run format && npm run lint && npm run build
```

Both builds MUST pass. Fix errors immediately.

### 3. CHANGELOG - MANDATORY
**After every significant code change, ALWAYS update the CHANGELOG section at the bottom of this file.**

- Add new entry with date and description of changes
- Include files that were changed
- Explain what was fixed or added
- This helps maintain context if conversation resets

**Format:**
```markdown
### YYYY-MM-DD: Brief Title
**Description**: What was changed or fixed
**Files Changed**:
- file path 1
- file path 2
```

### 4. Prisma Schema Changes - CRITICAL
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

### 2026-03-18: Manual Balance System
**Change**: Removed automatic balance updates from expenses and transfers.

**Files Changed**:
- `backend/src/expenses/expenses.service.ts` - Removed balance update logic from updateExpense/deleteExpense
- `backend/src/transfers/transfers.service.ts` - Removed auto balance updates
- `backend/prisma/schema.prisma` - Removed account_balance_adjustment table

**Rule**: Balance is manual. User sets it directly. Transactions do NOT affect balance.

---

## CHANGELOG

### 2026-08-10: "Unknown only" Filter Toggle on Refine & Bulk Edit Page

**Description**: Completed the "Unknown only" filter feature on the Refine & Bulk Edit page. Added a toggle button to the Search + sort toolbar (next to the Count/Amount/A-Z sort segmented control) that, when active, shows only group cards containing at least one expense with `categoryName === 'Unknown'`. The button mirrors sort-button styling (active: `bg-primary text-primary-foreground`, inactive: `bg-background text-muted-foreground hover:bg-muted`), uses a `CircleHelp` lucide icon, shows a live count chip of matching groups (computed via a small `unknownGroupCount` memo so users see how many groups will match before enabling), and persists across mode switches via `switchMode` (consistent with `sortBy`). Task 1 had already added the `unknownOnly` state and the group `.filter()` logic; this task wired up the UI, which also resolves the TS6133 unused-variable error on `unknownOnly`.

**Files Changed**:
- `frontend/src/pages/expenses/RefineExpenses.tsx` — imported `CircleHelp` from lucide-react (line 31); added `unknownGroupCount` useMemo (lines 151–154); added the "Unknown" toggle button to the Search + sort toolbar (lines 397–421)

---

### 2026-03-19: Standardized Code Quality Commands

**Description**: Updated all docs and configuration files to use consistent lint/format/build command sequence.

**Files Changed**:
- `AGENTS.md` - Updated frontend command
- `SYSTEM_PROMPT.md` - Updated both backend and frontend commands
- `docs/coding-rules.md` - Updated Code Quality Checks, Development Workflow, and Testing Changes sections

**New Command Flow**:
```bash
# Backend
cd backend && npm run lint:fix && npm run format && npm run lint && npm run build

# Frontend
cd frontend && npm run lint:fix && npm run format && npm run lint && npm run build
```

**Purpose**: Auto-fix lint issues → Format code → Check remaining lint issues → Build

### 2026-03-19: Bulk Upload Template with Month/Year Data + Amount Column

**Description**: Enhanced bulk upload to allow downloading pre-filled templates with existing expenses for a specific month/year. Added amount column to the template.

**Files Changed**:
- `backend/src/expense-upload/expense-upload.controller.ts` - Added `year` and `month` query params to template download
- `backend/src/expense-upload/expense-upload.service.ts` - Modified `generateTemplate()` to fetch and pre-fill expenses for selected month/year; Added amount column to Excel template
- `frontend/src/lib/api.ts` - Updated `downloadExpenseTemplate()` to accept year/month params
- `frontend/src/components/BulkUpload.tsx` - Added month/year dropdown selectors above download button
- `docs/api-routes.md` - Updated documentation for new query params

**New Feature**: Users can now select a month/year and download a template pre-filled with existing expenses for editing.

### 2026-03-19: Template Upload Column Parsing Fix

**Description**: Fixed column parsing in upload to use header-based lookup instead of index-based. This fixed issues where Excel reading would fail due to column offset problems.

**Files Changed**:
- `backend/src/expense-upload/expense-upload.service.ts` - Replaced index-based column access with header-based column name lookup using Map

**Lesson Learned**: Always use header-based column finding for Excel parsing to handle different Excel configurations.

### 2026-03-19: BulkExpenseForm Refactored

**Description**: Completely refactored BulkExpenseForm to fix category/account selection issues:
1. Category/Account values not showing after selection
2. Copy row not preserving values
3. New rows not auto-selecting default account

**Root Cause**: Previous implementation used refs unnecessarily causing closure issues.

**Files Changed**:
- `frontend/src/components/BulkExpenseForm.tsx` - Removed all refs, simplified to useState/useEffect only

**Solution**: 
- Removed unnecessary refs (accountsRef, defaultAccountIdRef, createEmptyRowRef, firstRowInitializedRef)
- Used simple boolean `initialized` state for form initialization
- Inline row creation in useEffect and addNewRow to avoid dependency issues

### 2026-03-20: Multi-Level Category System - Stage 3 Completed

**Description**: Implemented hierarchical category management UI with 3-level support and fixes to bulk expense form.

**Files Changed**:
- `frontend/src/pages/categories/Categories.tsx` - Complete rewrite to support 3-level hierarchy with expand/collapse, level display, proper create/delete actions
- `frontend/src/components/BulkExpenseForm.tsx` - Fixed category/account selection display issues, added proper row creation logic
- `frontend/src/lib/api.ts` - Updated category types to include level information, added new API functions for tree and stats endpoints

**Key Improvements**:
- Category list now shows hierarchical structure with expand/collapse functionality
- Each category displays its level (1, 2, or 3) 
- Proper validation for creating subcategories (auto-incrementing level)
- Fixed BulkExpenseForm to properly show selected category/account values
- Added proper TypeScript types for category data with level information

### 2026-03-19: Lint/Build Error Fixing Rules

**Description**: Updated coding rules to clarify handling of lint/build errors. Warnings requiring over-engineering can be skipped after reasonable attempts.

**Files Changed**:
- `docs/coding-rules.md` - Clarified that warnings can be skipped if they require excessive type casting or workarounds

### 2026-03-19: Pre-existing Lint Errors Fixed

**Description**: Fixed multiple pre-existing lint/build errors that were not related to recent changes.

**Files Changed**:
- `backend/src/main.ts` - Fixed floating promise with `void bootstrap()`
- `backend/src/expense-upload/expense-upload.service.ts` - Fixed Buffer type casting with `as unknown as ArrayBuffer`
- `backend/test/app.e2e-spec.ts` - Fixed type errors with `request` import
- `frontend/src/components/ui/badge.tsx` - Removed `badgeVariants` export
- `frontend/src/components/ui/button.tsx` - Removed `buttonVariants` export
- `frontend/src/components/ui/input.tsx` - Changed interface to type

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

### 2026-05-28: Amount Filter + Sorting on Expenses Page + Flexible Duplicate Criteria

**Description**: Two enhancements:

1. **Expenses page** — New filters and sorting in the filter bar:
   - Amount filter: dropdown selects "Greater than / Less than / Between", then numeric input(s). Maps to `amountMin`/`amountMax` backend params.
   - Sort controls: "Date | Amount" × "Newest/High first | Oldest/Low first". The backend already supported these params; the UI now exposes them.
   - Reset button now also clears amount filters.

2. **Duplicates page** — Three custom checkboxes at the top: **Date**, **Amount**, **Name (Recipient)**. All checked by default (original behavior). Unchecking Name lets the user find same-day same-amount entries regardless of recipient name — solves the problem of the same transaction appearing in both a bank statement import and a Google Pay import with different recipient strings.

**Backend changes:**
- `ExpenseQueryDto` — added `amountMin?: number` and `amountMax?: number`
- `getExpenses()` — applies `where.amount.gte/lte` when these params are provided
- `getDuplicates(criteria)` — now accepts `{ byDate, byAmount, byName }` booleans and builds the group key from only the selected fields
- Controller `getDuplicates` route — reads `?byDate=&byAmount=&byName=` query params (default true)

**Frontend changes:**
- `api.ts` — added `amountMin`, `amountMax` to `ExpenseQueryParams`; added `DuplicateCriteria` type; updated `fetchDuplicateExpenses` to pass criteria params
- `Expenses.tsx` — added `amountType`, `amountMin`, `amountMax`, `sortBy`, `sortOrder` state; included in queryParams and page-reset effect; added Amount and Sort UI blocks
- `DuplicateExpenses.tsx` — added `criteria` state and custom checkbox UI panel with explanatory text

### 2026-05-28: Refine & Bulk Edit Page + Skip Duplicates + Edit Suggestions

**Description**: Three new features added across backend and frontend:

1. **Skip duplicates** — "Skip — Not a duplicate" button on each duplicate group. Dismissed group keys are persisted to localStorage. "Show skipped (N)" toggle lets users undo dismissals.

2. **Refine & Bulk Edit page** (`/refine`) — Toggle switch between two modes:
   - *By Username*: groups all transactions by recipient (userName), lets user checkbox-select rows and bulk-assign category and/or notes via dialogs.
   - *By Category*: groups by category, same bulk-assign actions available.
   - Sticky action bar shows when items are selected. Groups are collapsible. "Select all" per group auto-expands it.

3. **Edit form suggestions** — When editing/creating an expense and "Sent To" has ≥2 chars, fetches past categories and notes for that username and shows clickable chips. Clicking a chip auto-fills the field.

**Backend endpoints added** (all placed before `/:id`):
- `PUT /expenses/bulk-update` — updates categoryId and/or remarks for an array of IDs
- `GET /expenses/suggestions?userName=X` — returns top 5 categories and up to 8 remarks used for that username

**Files Changed**:
- `backend/src/expenses/expenses.dto.ts` — added `BulkUpdateExpenseDto`
- `backend/src/expenses/expenses.service.ts` — added `bulkUpdateExpenses()` and `getSuggestionsForUser()`
- `backend/src/expenses/expenses.controller.ts` — added `PUT bulk-update` and `GET suggestions` routes
- `frontend/src/lib/api.ts` — added `SuggestionsResult`, `fetchSuggestionsForUser()`, `bulkUpdateExpenses()`
- `frontend/src/pages/expenses/DuplicateExpenses.tsx` — added skip/dismiss with localStorage persistence
- `frontend/src/pages/expenses/RefineExpenses.tsx` — new page (created)
- `frontend/src/components/AddExpenseForm.tsx` — added debounced suggestions UI
- `frontend/src/App.tsx` — added `/refine` route
- `frontend/src/components/layout/Navbar.tsx` — added Duplicates and Refine nav links

### 2026-05-28: Duplicate Transactions Page

**Description**: Added a new Duplicate Transactions screen that detects suspected duplicates (same date + amount + userName/recipient) and presents each duplicate group in its own table. Users can delete individual entries directly from the page.

**Files Changed**:
- `backend/src/expenses/expenses.service.ts` - Added `getDuplicates()` method
- `backend/src/expenses/expenses.controller.ts` - Added `GET /expenses/duplicates` route (placed before `/:id`)
- `frontend/src/lib/api.ts` - Added `fetchDuplicateExpenses()` function
- `frontend/src/pages/expenses/DuplicateExpenses.tsx` - New page component
- `frontend/src/App.tsx` - Added `/duplicates` route
- `frontend/src/components/layout/Navbar.tsx` - Added Duplicates nav link
- `frontend/src/components/ui/skeleton.tsx` - Fixed pre-existing empty interface lint error

**Logic**: Groups all expenses by `DATE(date)|amount|userName`. Any group with 2+ entries is shown as a duplicate group, each in its own amber-highlighted table card.

### 2026-03-20: Stage 4 - Expense Form Category Dropdown Update
**Change**: Updated expense forms to use leaf categories with hierarchical display.

**Files Changed**:
- `frontend/src/components/BulkExpenseForm.tsx` - Fixed useCallback bug, switched to `fetchLeafCategories`
- `frontend/src/components/AddExpenseForm.tsx` - Switched to `fetchLeafCategories`, added full path display
- `frontend/src/components/ui/searchable-select.tsx` - Added `level`, `fullPath` support and indentation display
- `backend/src/categories/categories.service.ts` - Added `fullPath` to `getLeafCategories()`
- `backend/src/expense-upload/expense-upload.service.ts` - Rewrote with leaf categories and full paths

**Features Added**:
1. Category dropdown now shows only leaf categories (or level 1/2 if no children)
2. Full path display: "Food > Groceries > Vegetables" instead of just "Vegetables"
3. Hierarchical indentation in dropdown options
4. Excel template dropdowns now use full path format
