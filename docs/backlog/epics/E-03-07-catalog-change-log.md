---
id: E-03-07
title: Maintain an immutable change log for every product/variant edit
status: planned
priority: P1
domain: backend
owner: claude
parents: []
acceptance:
  - A new append-only `catalog_change_log` table per ADR 0003 captures every catalog write (created / updated / archived / restored / deleted).
  - Each row carries entityType + entityId + entityRef (slug/SKU), parentEntityType + parentEntityId for variants/options, operation, changedFields[], before/after JSONB snapshots of the changed fields, actorId, occurredAt.
  - The log row writes in the SAME database transaction as the entity write — atomicity guaranteed; if either fails, both roll back.
  - No-op writes (UPDATE that changed nothing meaningful) do NOT emit a log row.
  - Cascaded writes (archiving a product cascades to variants) emit one log row per affected entity, all with the same actorId + occurredAt.
  - History reads are out of scope — they're owned by E-03-06 (thin UI wrapper after this lands).
size: medium
---

## Why

The existing catalog tables have minimal audit columns (`createdAt`, `updatedAt`, `createdBy`) but no per-change history. Per ADR 0003, append-only ledgers belong in a dedicated immutable table. This epic ships that table and wires every catalog write to emit a row, so E-03-06 can render the history with a thin read API.

## Out of scope

- **Read API + history view UI** — owned by E-03-06.
- **DB-level immutability trigger** (`RAISE EXCEPTION ON UPDATE / DELETE` against `catalog_change_log`) — log as follow-up; ADR 0003 calls for "DB-level where feasible" but the existing inventory ledger doesn't have one either, so we ship the application-layer write-only surface and add the trigger as a separate small migration.
- **Backfill of pre-existing catalog rows** — history starts at deploy time. If legal/compliance asks for retroactive history, a separate ticket synthesises `created` rows from `createdAt`/`createdBy`.
- **Media-assignment changes as first-class log rows** — represented as a `catalog_product` or `product_variant` `updated` row with `changedFields: ["mediaAssignments"]` and the snapshot in before/after.
- **Platform event publish** for change-log entries — existing `catalog.product.updated` etc. events already cover the notification surface.

## Design

Author: `node-backend-systems-architect`. Aligns with ADR 0003 (append-only ledgers).

### Schema

New `packages/database/src/schema/catalog-change-log.ts`. Single table `catalog_change_log` with:

- `id` (publicUuid)
- `entityType` (pg enum: `catalog_brand` | `catalog_category` | `catalog_product` | `product_variant` | `catalog_product_option` | `catalog_product_option_value`)
- `entityId` (uuid) + `entityRef` (varchar 120 — slug/SKU)
- `parentEntityType`, `parentEntityId` (nullable — for variants → product, options → product)
- `operation` (pg enum: `created` | `updated` | `archived` | `restored` | `deleted`)
- `changedFields` (jsonb array of strings, default `[]`)
- `before` (jsonb, null for `created`)
- `after` (jsonb, null for `deleted`)
- `actorId` (uuid FK to users)
- `occurredAt` + `createdAt` (timestamps)

Indexes:

- `(entityType, entityId, occurredAt DESC)` — primary read path for E-03-06's history view
- `(parentEntityType, parentEntityId, occurredAt DESC)` partial — assemble "everything that happened to product X including variants/options" with one query
- `(actorId, occurredAt DESC)` — "audit by user"

Three CHECK constraints enforce the operation/before/after invariants (created has after, deleted has before, updated/archived/restored have both).

### Granularity

**One row per write operation**, carrying `changedFields[]` + subset-JSONB before/after of the changed fields only. NOT one row per field. NOT whole-row snapshots. Trade-off: cheap storage + cheap reads, with `changedFields[]` denormalised for E-03-06 to filter on without parsing JSON.

### Wire-up

`recordChange()` is called from inside the existing `*Commands` classes (the lowest layer that owns the DB transaction), passing the same `tx`. Mirrors `inventory-ownership` shape.

A `CatalogChangeLogWriter` interface lives in the new module; each catalog command class accepts one in its constructor and calls it inside its existing `db.transaction(...)` block.

A `diffSnapshot(before, after, trackedFields)` helper computes `changedFields` + the subset before/after. Each command declares its tracked-fields constant — explicit allowlist, no reflection.

**No-op short-circuit**: if `changedFields.length === 0` and operation is `updated`, do not insert.

### Module placement

New `apps/api/src/modules/catalog-change-log/`:

- `catalog-change-log.types.ts` — entity / operation enums + `RecordCatalogChangeInput`
- `catalog-change-diff.ts` — `diffSnapshot` helper + tracked-fields constants
- `catalog-change-log-writer.service.ts` — `CatalogChangeLogWriter` interface
- `postgres-catalog-change-log.repository.ts` — implements writer
- `create-catalog-change-log-runtime.ts` — composition root
- `README.md`

### Sequencing (per architect)

Five logical chunks; **PR 1 ships chunks (a) + (b)** for one cohesive foundation:

- (a) Schema + migration + new module skeleton
- (b) Wire `catalog_product` + `product_variant` writes (highest user-facing value)
- (c) Wire `catalog_brand` + `catalog_category` — **PR 2** follow-up
- (d) Wire `catalog_product_option` + option-values — **PR 2** follow-up
- (e) Tests + README — partly in PR 1, partly in PR 2

## Tasks (PR 1 — foundation, this PR)

1. Schema: `packages/database/src/schema/catalog-change-log.ts` with table + 2 enums + 3 indexes + 3 check constraints. Migration. Schema-test assertions for the new table.
2. Module skeleton: types, `diffSnapshot` helper, `CatalogChangeLogWriter` interface, `PostgresCatalogChangeLogWriter` impl, runtime composition, README.
3. Tests for the diff helper (unit) and the postgres writer integration (insert + read-back).

## Tasks (PR 2 — wire-up, immediate follow-up)

4. Wire `CatalogProductCommands.create` / `update` / `delete` to emit log rows in the same tx. Add product tracked-fields constant.
5. Wire `CatalogVariantCommands` (`createVariant` / `updateVariant` / `deleteVariant`). Tracked-fields constant.
6. Wire brand + category write services.
7. Wire options + option-values.
8. Update `create-catalog-runtime.ts` to construct the change-log runtime and inject the writer into commands.
9. Atomicity tests (throwing writer rolls back the entity write), cascade tests, no-op short-circuit tests.

## Tasks (PR 3 — DB-level immutability, optional follow-up)

10. DB-level trigger raising on `UPDATE` / `DELETE` against `catalog_change_log`.

## Why split PR 1 from the wire-up

PR 1 ships the writer infrastructure as a single coherent module. PR 2 immediately consumes it across every catalog write path. The wire-up touches multiple files near the 250-line soft cap (e.g. `postgres-catalog-product-write.commands.ts` is at 273 lines today); putting the wire-up + foundation in one PR would force a code-split refactor inside the same PR. Splitting cleanly is the lower-risk play. PR 2 will land within the same session as PR 1 — this isn't "five surface-only PRs in a row," it's "foundation + wire-up as two atomic units."
