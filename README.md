# Shop App V2

Clean-slate implementation of the stock, sales, delivery, portal, and storefront platform described in the backlog workbook.

## Why this repo exists

The first implementation accumulated architectural drift. This repo restarts from a modular monolith baseline with strict boundaries so the system can scale without fragmenting into inconsistent patterns.

## Architecture summary

- `apps/api`: backend HTTP API and background-job entrypoints
- `apps/web`: Next.js 16 portal and storefront surface
- `packages/contracts`: shared API contracts and public DTO schemas
- `packages/database`: PostgreSQL schema, migrations, and database conventions
- `packages/domain`: domain primitives, architectural policies, and cross-cutting types
- `docs`: ADRs, backlog interpretation, and engineering standards

## Frontend system

- `apps/web` uses `shadcn/ui` as the source-controlled primitive library
- product styling comes from the local token layer and system wrappers, not raw shadcn defaults
- frontend rules live in `docs/frontend/design-system.md` and `docs/frontend/agent-rules.md`

## Non-negotiable rules

- Public APIs expose slugs and reference numbers, not raw database IDs
- Route-level authorization is mandatory for every protected API endpoint
- Ownership, stock, and audit trails are append-only where the backlog requires immutability
- Ownership ledger rows are true append-only records: no `effective_to` column, no row updates, corrections via compensating events only
- Business rules live in services and domain modules, never inline in route handlers
- Every backlog item must map back to acceptance criteria and definition-of-done evidence

## Commands

```bash
pnpm install
pnpm verify
pnpm --filter @shop/api dev
pnpm --filter @shop/web dev
```

## Branch naming

Use one of these patterns:

- `feature/e-01-01-auth-foundation`
- `fix/e-00d-02-permission-cache`
- `chore/ops-repo-maintenance`

Hooks enforce branch naming, guards, type checks, tests, and build validation before pushes.

## Delivery model

We are executing the workbook in dependency order. Foundation work comes first:

1. Identity and access control
2. Public identifiers and routing infrastructure
3. Immutable stock ownership ledger
4. Stock balance and reservation concurrency controls
5. Locations, products, deliveries, and portal features on top of those primitives

Read [AGENTS.md](./AGENTS.md) before making changes.
