# Expense Tracker

## Stack

- Backend: NestJS v11, Prisma ORM, MySQL
- Frontend: React 19, Vite, TypeScript, TanStack Query, shadcn/ui, Tailwind CSS v4

## Key Files

| Purpose        | Location                     |
| -------------- | ---------------------------- |
| DB Schema      | backend/prisma/schema.prisma |
| Backend Routes | backend/src/\*/controllers/  |
| Frontend API   | frontend/src/lib/api.ts      |
| Frontend Pages | frontend/src/pages/          |
| Components     | frontend/src/components/     |

## Critical Rules

- **Prisma**: NEVER run `prisma migrate dev`. Only `npx prisma generate` after schema changes.

## Docs (read only when relevant to your task)

- Architecture: docs/architecture.md
- API routes: docs/api-routes.md
- DB schema: docs/db-schema.md
- Coding rules: docs/coding-rules.md
- Full documentation: docs/DOCUMENTATION.md
