-- MANUAL MIGRATION SCRIPT
-- Refactor: Remove M:N expense_category_mapping, add categoryId FK to expenses_data_master
-- Add: account_balance_adjustment table for audit trail
--
-- REVIEW CAREFULLY BEFORE RUNNING
-- Backup your database first!

-- ============================================================
-- STEP 1: Create temporary Uncategorized category (for migration)
-- ============================================================
-- This ensures no data loss - expenses with multiple categories
-- will be assigned to their first category, orphaned ones go here

INSERT INTO category_master (name, parentId)
SELECT 'Uncategorized', NULL
WHERE NOT EXISTS (SELECT 1 FROM category_master WHERE name = 'Uncategorized');

-- ============================================================
-- STEP 2: Create account_balance_adjustment table
-- ============================================================
CREATE TABLE account_balance_adjustment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  accountId INT NOT NULL,
  amount DOUBLE NOT NULL COMMENT 'Positive or negative adjustment',
  reason VARCHAR(500) NOT NULL COMMENT 'Required explanation for audit trail',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_accountId (accountId),
  CONSTRAINT fk_adjustment_account
    FOREIGN KEY (accountId)
    REFERENCES account_master(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- STEP 3: Add categoryId column to expenses_data_master
-- ============================================================
-- First add as nullable
ALTER TABLE expenses_data_master
ADD COLUMN categoryId INT NULL;

-- Add index for performance
CREATE INDEX idx_expense_categoryId ON expenses_data_master(categoryId);

-- ============================================================
-- STEP 4: Migrate existing expense-category mappings
-- ============================================================
-- For each expense, take the FIRST category from the mapping table
-- This is deterministic and auditable

UPDATE expenses_data_master edm
INNER JOIN (
  SELECT
    expenseId,
    MIN(categoryId) AS categoryId  -- Take first (lowest) categoryId
  FROM expense_category_mapping
  GROUP BY expenseId
) ecm ON edm.id = ecm.expenseId
SET edm.categoryId = ecm.categoryId
WHERE edm.categoryId IS NULL;

-- ============================================================
-- STEP 5: Assign remaining NULL categoryId to Uncategorized
-- ============================================================
-- Any expense without mappings gets the Uncategorized category

UPDATE expenses_data_master edm
INNER JOIN category_master cm ON cm.name = 'Uncategorized'
SET edm.categoryId = cm.id
WHERE edm.categoryId IS NULL;

-- ============================================================
-- STEP 6: Make categoryId NOT NULL (enforce referential integrity)
-- ============================================================
ALTER TABLE expenses_data_master
MODIFY COLUMN categoryId INT NOT NULL;

-- Add foreign key constraint
ALTER TABLE expenses_data_master
ADD CONSTRAINT fk_expense_category
  FOREIGN KEY (categoryId)
  REFERENCES category_master(id)
  ON DELETE RESTRICT;  -- RESTRICT to prevent accidental category deletion

-- ============================================================
-- STEP 7: Drop the mapping table (no longer needed)
-- ============================================================
DROP TABLE IF EXISTS expense_category_mapping;

-- ============================================================
-- STEP 8: Update expenses_data_master relation in Prisma terms
-- ============================================================
-- The foreign key is already created above, this is just cleanup

-- ============================================================
-- VERIFICATION QUERIES (run these to confirm migration success)
-- ============================================================

-- 1. Check no NULL categoryId exists
SELECT COUNT(*) AS null_category_count
FROM expenses_data_master
WHERE categoryId IS NULL;  -- Should return 0

-- 2. Check all expenses have valid category
SELECT edm.id, edm.categoryId, cm.name
FROM expenses_data_master edm
LEFT JOIN category_master cm ON edm.categoryId = cm.id
WHERE cm.id IS NULL;  -- Should return empty

-- 3. Verify mapping table is dropped
-- This should error if table was dropped successfully:
-- SELECT COUNT(*) FROM expense_category_mapping;

-- 4. Count expenses in Uncategorized category
SELECT cm.name, COUNT(edm.id) AS expense_count
FROM expenses_data_master edm
JOIN category_master cm ON edm.categoryId = cm.id
WHERE cm.name = 'Uncategorized'
GROUP BY cm.name;  -- Review this count

-- ============================================================
-- POST-MIGRATION: Update Prisma Client
-- ============================================================
-- After running this SQL, execute:
-- npx prisma generate
-- (in the backend directory)
