# Expense Module - Pending Work

## Current State
Backend is complete with:
- CRUD operations
- Single category relationship (categoryId NOT NULL)
- Balance management transactions
- Pagination + filtering API
- Dashboard KPIs endpoint

Frontend has basic:
- List view with filters (date range, category, account, search)
- Pagination
- Add/Edit modal form
- KPI cards (total, top categories)

## Enhancement Tasks

### 1. Expenses Analysis Page
Create comprehensive analytics:
- Weekly/daily spending trends
- Category breakdown (donut chart)
- Account-wise distribution
- Month-over-month comparison bar chart
- YoY comparison toggle

### 2. Budget Management (New Feature)
**Backend:**
- Add `budget_master` table: id, categoryId, month, year, limitAmount, createdAt
- CRUD endpoints: GET/POST/PUT /budgets
- Alert endpoint: GET /budgets/alerts (categories exceeding budget)

**Frontend:**
- Budget setup page
- Budget vs actual progress bars
- Overspending alerts on dashboard

### 3. Recurring Expenses
**Backend:**
- Add `recurring_expenses` table: id, template data, frequency (daily/weekly/monthly), lastGenerated
- Scheduler service for auto-creation
- GET /recurring, POST /recurring, DELETE /recurring/:id

**Frontend:**
- Recurring expenses management page
- Toggle to show recurring in main list

### 4. Export/Reports
**Backend:**
- GET /expenses/export?format=csv&startDate=&endDate=
- GET /expenses/report?format=pdf (optional)

**Frontend:**
- Export button in Expenses page
- Print-friendly view component

### 5. Enhanced Filters
Add to Expenses page:
- Amount range slider (min-max)
- Payment method dropdown (from account type)
- Multi-category select (tags input)
- "Saved filters" for quick access

### 6. Category Page Implementation
Currently Categories.tsx is basic. Build:
- Tree view for hierarchy
- Drag-drop for reordering
- Bulk operations (delete, merge)
- Category spending summary

### Priority Order:
1. Enhanced filters (quick win)
2. Category page UI
3. Export functionality
4. Analysis page
5. Budget management (requires schema change)
6. Recurring expenses (requires schema change + scheduler)