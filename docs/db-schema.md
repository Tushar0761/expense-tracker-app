# Database Schema Documentation

## Database: MySQL (via Prisma ORM)

## Tables

### category_master

Hierarchical category structure (self-referential, 3-level max).

| Column   | Type   | Constraints                       | Description                  |
| -------- | ------ | --------------------------------- | ---------------------------- |
| id       | Int    | PK, Auto-increment                | Unique ID                    |
| name     | String | Required                          | Category name                |
| level    | Int    | NOT NULL, DEFAULT 1               | Hierarchy level (1, 2, or 3) |
| parentId | Int?   | Nullable, FK → category_master.id | Parent category ID           |

**Level Rules:**

- Level 1: Root categories (parentId = NULL)
- Level 2: Sub-categories of Level 1
- Level 3: Sub-categories of Level 2 (max depth)

**Relations:**

- Self-referential: parent (1:N) children

---

### account_master

User accounts (Cash, Bank, Credit Card).

| Column      | Type              | Constraints        | Description                     |
| ----------- | ----------------- | ------------------ | ------------------------------- |
| id          | Int               | PK, Auto-increment | Unique ID                       |
| name        | String            | Required           | Account name                    |
| type        | enum account_type | Required           | CASH, BANK, CREDIT              |
| balance     | Float             | Default 0          | **MANUAL** - User sets manually |
| creditLimit | Float?            | Default 0          | Credit limit (for CREDIT type)  |
| createdAt   | DateTime          | Default now()      | Creation timestamp              |
| updatedAt   | DateTime          | Auto-updated       | Last update timestamp           |

**Relations:**

- (1:N) expenses_data_master
- (1:N) transfer_data_master (as fromAccount)
- (1:N) transfer_data_master (as toAccount)

---

### expenses_data_master

Main expense transactions.

| Column       | Type     | Constraints                        | Description             |
| ------------ | -------- | ---------------------------------- | ----------------------- |
| id           | Int      | PK, Auto-increment                 | Unique ID               |
| date         | DateTime | Required                           | Expense date            |
| amount       | Float    | Required                           | Expense amount          |
| remarks      | String?  | Nullable                           | Notes                   |
| accountId    | Int?     | Nullable, FK → account_master.id   | Payment account         |
| categoryId   | Int      | FK → category_master.id            | **NOT NULL** - Category |
| emiPaymentId | Int?     | Nullable, FK → emi_payment_data.id | Link to EMI             |
| createdAt    | DateTime | Default now()                      | Creation timestamp      |

**Relations:**

- (N:1) account_master (optional)
- (N:1) category_master
- (N:1) emi_payment_data (optional)

---

### transfer_data_master

Inter-account money transfers.

| Column        | Type     | Constraints            | Description         |
| ------------- | -------- | ---------------------- | ------------------- |
| id            | Int      | PK, Auto-increment     | Unique ID           |
| date          | DateTime | Required               | Transfer date       |
| amount        | Float    | Required               | Transfer amount     |
| fromAccountId | Int      | FK → account_master.id | Source account      |
| toAccountId   | Int      | FK → account_master.id | Destination account |
| remarks       | String?  | Nullable               | Notes               |
| createdAt     | DateTime | Default now()          | Creation timestamp  |

**Relations:**

- (N:1) fromAccount → account_master
- (N:1) toAccount → account_master

---

### borrower_master

Loan borrowers/lenders.

| Column          | Type     | Constraints        | Description        |
| --------------- | -------- | ------------------ | ------------------ |
| id              | Int      | PK, Auto-increment | Unique ID          |
| borrowerName    | String   | Required           | Borrower name      |
| borrowerContact | String?  | Nullable           | Contact info       |
| createdAt       | DateTime | Default now()      | Creation timestamp |
| updatedAt       | DateTime | Auto-updated       | Last update        |

---

### loans_master

Loan records.

| Column        | Type                     | Constraints                       | Description                         |
| ------------- | ------------------------ | --------------------------------- | ----------------------------------- |
| id            | Int                      | PK, Auto-increment                | Unique ID                           |
| borrowerId    | Int?                     | Nullable, FK → borrower_master.id | Borrower                            |
| borrowerName  | String?                  | VarChar(100)                      | Borrower name (if no borrowerId)    |
| dueDate       | DateTime?                | Nullable                          | Due date                            |
| status        | enum loans_master_status | Required                          | active, closed, defaulted           |
| notes         | String?                  | Nullable                          | Notes                               |
| createdAt     | DateTime                 | Default now()                     | Creation timestamp                  |
| updatedAt     | DateTime                 | Auto-updated                      | Last update                         |
| initialAmount | Float                    | Required                          | Principal amount                    |
| interestRate  | Float                    | Required                          | Annual interest rate (%)            |
| loanDate      | Date                     | Required                          | Loan start date                     |
| totalAmount   | Float                    | Required                          | Total amount (principal + interest) |

**Relations:**

- (N:1) borrower_master (optional)
- (1:N) emi_payment_data
- (1:N) future_payment_data_master

---

### emi_payment_data

EMI/repayment records.

| Column          | Type                                | Constraints                                | Description                             |
| --------------- | ----------------------------------- | ------------------------------------------ | --------------------------------------- |
| id              | Int                                 | PK, Auto-increment                         | Unique ID                               |
| loanId          | Int                                 | FK → loans_master.id                       | Loan reference                          |
| paymentDate     | DateTime                            | Required                                   | Payment date                            |
| principalAmount | Float                               | Required                                   | Principal portion                       |
| interestAmount  | Float                               | Required                                   | Interest portion                        |
| totalAmount     | Float                               | Required                                   | Total payment                           |
| paymentMethod   | enum emi_payment_data_paymentMethod | Required                                   | cash, bank_transfer, upi, cheque, other |
| notes           | String?                             | Nullable                                   | Notes                                   |
| createdAt       | DateTime                            | Default now()                              | Creation timestamp                      |
| futurePaymentId | Int?                                | Unique, FK → future_payment_data_master.id | Link to future payment                  |

**Relations:**

- (N:1) loans_master
- (1:1) future_payment_data_master (optional)
- (1:N) expenses_data_master (optional)

---

### future_payment_data_master

Planned/scheduled payments.

| Column          | Type                                   | Constraints              | Description                   |
| --------------- | -------------------------------------- | ------------------------ | ----------------------------- |
| id              | Int                                    | PK, Auto-increment       | Unique ID                     |
| loanId          | Int                                    | FK → loans_master.id     | Loan reference                |
| plannedDate     | DateTime                               | Required                 | Planned payment date          |
| principalAmount | Float                                  | Required                 | Principal portion             |
| interestAmount  | Float                                  | Required                 | Interest portion              |
| totalAmount     | Float                                  | Required                 | Total amount                  |
| status          | enum future_payment_data_master_status | Required                 | pending, completed, cancelled |
| notes           | String?                                | Nullable                 | Notes                         |
| createdAt       | DateTime                               | Default now()            | Creation timestamp            |
| updatedAt       | DateTime?                              | Auto-updated             | Last update                   |
| emiPaymentId    | Int?                                   | FK → emi_payment_data.id | Link to actual payment        |

**Relations:**

- (N:1) loans_master
- (1:1) emi_payment_data (optional)

---

### asset_master

Asset tracking (schema only - not implemented).

| Column    | Type     | Constraints        | Description        |
| --------- | -------- | ------------------ | ------------------ |
| id        | Int      | PK, Auto-increment | Unique ID          |
| type      | String   | Required           | Asset type         |
| name      | String   | Required           | Asset name         |
| quantity  | Float    | Required           | Quantity           |
| price     | Float    | Required           | Unit price         |
| value     | Float    | Required           | Total value        |
| createdAt | DateTime | Default now()      | Creation timestamp |

---

## Enums

### account_type

- CASH - Cash/Wallet
- BANK - Bank Account
- CREDIT - Credit Card

### loans_master_status

- active - Loan is active
- closed - Loan is fully paid
- defaulted - Loan defaulted

### emi_payment_data_paymentMethod

- cash
- bank_transfer
- upi
- cheque
- other

### future_payment_data_master_status

- pending - Payment scheduled
- completed - Payment done
- cancelled - Payment cancelled

---

## Important Notes

1. **Account Balance**: Balance is **MANUALLY SET** by user. Expenses/transfers do NOT auto-update balance.

2. **Category Hierarchy**: Categories use self-referential parentId. Supports multi-level nesting (2-4 levels typical).

3. **Expense Category**: Each expense has exactly ONE category (categoryId is NOT NULL).

4. **EMI Linkage**: EMI payments can optionally link to future payments (marks future payment as completed).
