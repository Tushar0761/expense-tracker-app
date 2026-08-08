# Fixed vs Discretionary Expense Analysis — Design

**Date**: 2026-08-08
**Status**: Approved, ready for planning

## Problem

Monthly loan EMI (₹20-30k of a ₹58k income, ~50%) is imported automatically from bank
statement scrapers (BOB/SBI) as a normal expense row under a "Loan EMI" category. This is
correct — it's real money spent — but it dominates every dashboard view:

- KPI totals and top-category lists are always headed by the EMI.
- The day-spend/trend chart spikes hugely on the EMI debit date, distorting the scale and
  making other spending look flat by comparison.
- There's no way to see "how much of my discretionary budget have I actually spent this
  month" without the EMI noise.

Loan payments recorded through the Loans module's "record payment" flow already live in a
separate table (`emi_payment_data`) and never touch `expenses_data_master` — so this problem
is specific to the auto-imported bank-scraper EMI expense rows, not the Loans module itself.

## Goal

Let the dashboard distinguish **Fixed** (committed, recurring: EMI, rent, subscriptions) from
**Discretionary** (variable, cuttable: food, shopping, cabs, etc.) spending, so:

- Charts/KPIs can be viewed as All / Fixed only / Discretionary only.
- A simple discretionary budget can be tracked against discretionary-only spend.
- Trend/day charts stop being distorted by the EMI spike (via the same toggle).

## Non-goals

- No `emiPaymentId` linking between `expenses_data_master` and `emi_payment_data` — category
  tagging already reliably identifies EMI expenses since they come in with a dedicated
  category; the FK link would add plumbing without adding filtering capability.
- No auto-derived budget (income − fixed costs) — budget is a single manually-set number.
- No monthly budget history — one current value, no per-month tracking over time.
- No changes to the Loans module or `emi_payment_data`/`future_payment_data_master` — those
  are untouched by this design.

## Data model

New enum:

```prisma
enum spend_type {
  FIXED
  DISCRETIONARY
}
```

Changes to existing models:

```prisma
model category_master {
  // ...existing fields
  spendType spend_type @default(DISCRETIONARY)
}

model expenses_data_master {
  // ...existing fields
  spendType spend_type?   // null = inherit from category
}
```

**Effective type** for any expense = `expense.spendType ?? category.spendType`.

New model for the budget number (single row, no history, no user/month key — scope is
intentionally minimal):

```prisma
model budget_setting {
  id                  Int  @id @default(autoincrement())
  discretionaryBudget Decimal @db.Decimal(10, 2)
  updatedAt           DateTime @updatedAt
}
```

### Migration note

Existing categories default to `DISCRETIONARY`. After migrating, the "Loan EMI" category (and
any other fixed categories, e.g. rent/subscriptions if they exist) must be manually set to
`FIXED` via the Categories page — this is a one-time manual step, not automated guessing.

## Backend changes

**Categories module** (`categories.service.ts`, `categories.controller.ts`, DTOs):
- `POST /categories` and category update accept `spendType`.
- List/tree/flat responses include `spendType`.

**Expenses module** (`expenses.service.ts`, `expenses.controller.ts`, DTOs):
- `CreateExpenseDto` / `UpdateExpenseDto` gain optional `spendType`.
- `PUT /expenses/bulk-update` gains `spendType` as a bulk-settable field (alongside existing
  category/remarks bulk edit), for use from Refine Expenses.
- New query param `spendTypeFilter?: 'ALL' | 'FIXED' | 'DISCRETIONARY'` (default `'ALL'`) added
  to:
  - `GET /expenses/dashboard` (`getDashboardKPIs`)
  - `GET /expenses/summary` (`getExpenseSummary`)
  - `GET /expenses/category-totals` (`getCategoryWiseTotals`)
  - `GET /expenses` (`getExpenses`)
- Filtering logic (same pattern in all four): join to `category_master`, compute effective
  type, filter by it when `spendTypeFilter !== 'ALL'`. Implemented as a `WHERE` clause
  addition — no new endpoints.

**New budget endpoints**:
- `GET /budget` — returns the single `budget_setting` row, or `null` if unset.
- `PUT /budget` — upsert `discretionaryBudget`.

## Frontend changes

**`Dashboard.tsx`**:
- New 3-way segmented toggle (All / Discretionary / Fixed) next to the existing date-range
  controls. Drives `spendTypeFilter` on all dashboard API calls (KPIs, category totals,
  summary/trend, and the `fetchExpenses` calls that feed `DashboardInsights` and Recent
  Transactions).
- Because the trend chart and `DashboardInsights` (day-of-week, heatmap, burn-down-of-month,
  recurring merchants, etc.) already derive everything client-side from `fetchExpenses(...)`
  results, switching to "Discretionary" naturally removes the EMI-day spike from all of those
  views — no separate chart-annotation logic needed.
- New **budget burn-down card**, shown when toggle is "All" or "Discretionary": displays
  discretionary budget, spent-so-far (this month, discretionary-only total), remaining, and a
  progress bar. Editable inline (click to set/update, calls `PUT /budget`). If no budget is
  set yet, shows a prompt state instead of a broken bar.

**`Categories.tsx`**: add a Fixed/Discretionary select on category create/edit.

**Expense add/edit form** (`AddExpenseForm.tsx` or equivalent edit form): add an optional
spendType select, defaulting to "Use category default" (i.e., leaves the override `null`).

**`RefineExpenses.tsx`**: add `spendType` as a bulk-editable field alongside the existing bulk
category/remarks editing.

**`lib/api.ts`**: extend `Category` type and create/update DTOs, `ExpenseRow` and its
create/update param types, `DashboardKPIs`-fetching params, `CategoryTotal` params,
`ExpenseSummaryParams` — all gain `spendType`/`spendTypeFilter` as applicable. Add
`fetchBudget()` / `updateBudget()`.

## Edge cases

- **No `spendType` set on old data**: schema default (`DISCRETIONARY`) covers it; fixing the
  "Loan EMI" category to `FIXED` is a manual one-time step post-migration (see Migration note).
- **Budget not yet set**: `GET /budget` returns `null`; dashboard shows a "set a discretionary
  budget" prompt instead of a broken progress bar.
- **`spendTypeFilter=FIXED` with no fixed categories tagged yet**: charts show empty/zero
  state, not an error.
- **Category deletion**: no change to existing behavior; out of scope.

## Testing approach

No existing automated test suite pattern in this codebase (personal single-user app). Verify
manually:
- Backend: exercise each modified endpoint with all three `spendTypeFilter` values via a REST
  client, confirm totals split correctly against known data.
- Frontend: run the dev server, toggle All/Fixed/Discretionary on the real dashboard with the
  actual "Loan EMI" category tagged `FIXED`, confirm the EMI-day spike disappears in
  Discretionary mode and the budget burn-down reflects real numbers.
