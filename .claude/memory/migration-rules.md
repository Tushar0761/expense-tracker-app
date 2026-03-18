# Database Migration Rules - Expense Tracker App

## ⚠️ CRITICAL: Never Run These Commands

Running the following commands will **RESET YOUR DATABASE** and cause **DATA LOSS**:

```bash
npx prisma migrate dev
npx prisma migrate reset
npx prisma db push --force-reset
```

## ✅ Safe Migration Process

When you need to make schema changes to the Prisma schema, follow these steps:

### Step 1: Backup Current Schema
```bash
# First, copy current schema.prisma to schemaOld.prisma
cp backend/prisma/schema.prisma backend/prisma/schemaOld.prisma
```

### Step 2: Make Schema Changes
Edit `backend/prisma/schema.prisma` with your new model definitions.

### Step 3: Create Comparison Schema
Create a temporary file `backend/prisma/schemaNew.prisma` with the new schema including your changes.

### Step 4: Generate Migration SQL
```bash
cd backend
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schemaNew.prisma --script > migration.sql
```

### Step 5: Review and Apply
1. Open `migration.sql` and review the SQL statements
2. If the changes look correct and safe, apply them directly to your MySQL database using your preferred SQL client (MySQL Workbench, DBeaver, command line, etc.)
3. If the SQL looks wrong or destructive, manually modify it or create custom SQL

### Step 6: Update Prisma Client
```bash
npx prisma generate
```

## Why This Process?

- `prisma migrate dev` creates a new migration and runs it against a fresh database (reset)
- This destroys all existing data in the database
- By generating SQL and applying manually, you preserve your data
- The migration SQL shows exactly what will change, allowing review

## What Changes Require Migration?

- Adding new tables/models
- Adding new columns to existing tables
- Changing column types or constraints
- Adding new relationships
- Dropping tables or columns

## What Doesn't Require Migration?

- Adding comments to schema
- Changing field order in model
- Adding optional fields that won't affect the database

## Emergency Recovery

If you accidentally ran `prisma migrate dev`:
1. Check if there's a backup of the database
2. Review the migration files in `prisma/migrations` to understand what was done
3. Rebuild from last known good state if possible
4. This is why the schemaOld.prisma file exists - to track schema history

---

**Remember:** The database contains real financial data. Treat it with extreme caution.