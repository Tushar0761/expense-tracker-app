# API Routes Documentation

Base URL: `http://localhost:3000/api`

## Accounts (`/accounts`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/accounts` | Create account | `{ name, type, balance?, creditLimit? }` |
| GET | `/accounts` | Get all accounts | - |
| GET | `/accounts/:id` | Get account by ID | - |
| PUT | `/accounts/:id` | Update account | `{ name?, type?, creditLimit? }` |
| DELETE | `/accounts/:id` | Delete account | - |
| PUT | `/accounts/:id/balance` | Set account balance (manual) | `{ balance: number }` |

## Categories (`/categories`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/categories/create` | Create category | `{ name, parentId? }` |
| GET | `/categories` | Get hierarchical categories | - |
| GET | `/categories/flat` | Get all categories flat | - |
| GET | `/categories/:id/subcategories` | Get subcategories | - |
| DELETE | `/categories/:id` | Delete category | - |

## Expenses (`/expenses`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/expenses/create` | Create expense | `{ date, amount, categoryId, accountId?, remarks? }` |
| GET | `/expenses` | Get expenses (paginated) | Query: `page, limit, startDate, endDate, categoryId, accountId` |
| GET | `/expenses/:id` | Get expense by ID | - |
| PUT | `/expenses/:id` | Update expense | `{ date?, amount?, categoryId?, accountId?, remarks? }` |
| DELETE | `/expenses/:id` | Delete expense | - |
| GET | `/expenses/summary` | Get expense summary | Query: `startDate, endDate` |
| GET | `/expenses/category-totals` | Get category totals | Query: `startDate, endDate` |
| GET | `/expenses/dashboard` | Get dashboard KPIs | - |

## Expense Excel Upload (`/expense-excel`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `/expense-excel/template` | Download Excel template | Query: `year`, `month` (optional) |
| POST | `/expense-excel/upload` | Upload Excel/CSV file | `multipart/form-data with 'file' field` |

### Template Download
- Without params: Downloads blank template
- With `year` & `month`: Downloads template pre-filled with that month's expenses

Example: `GET /api/expense-excel/template?year=2024&month=3`

### Template Format (Excel)
Columns: `id`, `date`, `amount`, `account`, `category`, `note`, `delete`
- `id`: Blank for new entries, or existing ID to update
- `amount`: Expense amount (required for new entries)
- `account` & `category`: Use dropdown values from Lists sheet
- `note`: Optional remarks (max 500 chars)
- `delete`: Enter "yes" to delete (only works with existing ID)

### Upload Response
```json
{
  "inserted": 5,
  "updated": 2,
  "deleted": 1,
  "errors": []
}
```

If validation errors occur:
```json
{
  "inserted": 0,
  "updated": 0,
  "deleted": 0,
  "errors": [
    { "rowNumber": 3, "field": "category", "value": "Invalid", "error": "Category not found" }
  ]
}
```

## Transfers (`/transfers`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/transfers` | Create transfer | `{ date, amount, fromAccountId, toAccountId, remarks? }` |
| GET | `/transfers` | Get all transfers | - |
| DELETE | `/transfers/:id` | Delete transfer | - |

## Loans (`/loans`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/loans/create` | Create loan | `{ borrowerId?, borrowerName, loanDate, initialAmount, interestRate, dueDate?, notes? }` |
| POST | `/loans/add-borrower` | Add borrower | `{ borrowerName }` |
| POST | `/loans/record-payment` | Record EMI payment | `{ loanId, paymentDate, principalAmount, interestAmount, totalAmount, paymentMethod, notes?, futurePaymentId? }` |
| POST | `/loans/bulk-future-payments` | Bulk create future payments | `{ loanId, startDate, endDate, emiAmount, paymentMethod }` |
| GET | `/loans/insight` | Get loans insight data | - |
| GET | `/loans/graph` | Get loans graph data | - |
| GET | `/loans/table` | Get loans table data | - |
| GET | `/loans/payments` | Get all EMI payments | - |
| GET | `/loans/future-payments` | Get future payments | - |
| GET | `/loans/borrowers` | Get all borrowers | - |
| GET | `/loans/borrower/:borrowerId` | Get loans by borrower | - |
| GET | `/loans/:loanId/future-payments` | Get future payments by loan | - |
| GET | `/loans/:loanId/planning-summary` | Get loan planning summary | - |

## Request/Response Types

### CreateExpenseDto
```json
{
  "date": "2024-01-15",
  "amount": 500,
  "categoryId": 1,
  "accountId": 1,
  "remarks": "Lunch"
}
```

### ExpenseQueryDto
```
?page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31&categoryId=1&accountId=1
```

### CreateLoanDto
```json
{
  "borrowerName": "John Doe",
  "loanDate": "2024-01-01",
  "initialAmount": 100000,
  "interestRate": 12,
  "dueDate": "2025-01-01",
  "notes": "Home loan"
}
```

### RecordPaymentDto
```json
{
  "loanId": 1,
  "paymentDate": "2024-02-01",
  "principalAmount": 8000,
  "interestAmount": 1000,
  "totalAmount": 9000,
  "paymentMethod": "bank_transfer",
  "futurePaymentId": 5
}
```
