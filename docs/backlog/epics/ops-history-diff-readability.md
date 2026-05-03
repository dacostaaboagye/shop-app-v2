---
id: ops-history-diff-readability
title: Resolve FK referent names in catalog change-log diffs (Phase 2 of E-03-06)
status: shipped
priority: P2
domain: full-stack
owner: claude
parents: [E-03-06]
acceptance:
  - When an operator expands "Show changes" on any catalog change-log entry, foreign-key field changes show human-readable names on both BEFORE and AFTER, never raw UUIDs.
  - The categories affected: `categoryId` and `brandId` on products; `parentCategoryId` on categories. Variants currently track no FK fields, so they are unaffected.
  - Snapshots stamped before this change ship continue to render — frontend handles the legacy "raw UUID" shape gracefully (renders the UUID label suppressed, with a small hint that the diff is from a pre-resolution row).
  - No new public IDs leak through the public surface; the resolved name is rendered, never the UUID alongside it.
  - Tests cover (a) snapshot helpers stamp resolved names alongside the IDs, (b) `<FieldDiff>` renders the name when the snapshot has the resolved shape, (c) `<FieldDiff>` falls back to "—" or a sentinel when the snapshot only has a UUID (legacy data).
size: small
---

## Why

E-03-06 ships a stakeholder-readable history view: display name primary, UUIDs suppressed in the entry header. **The diff body still leaks UUIDs** for foreign-key fields. When a manager changes a product's category from "Crossbody Bags" to "Travel Bags", expanding the entry shows:

```
Category
  BEFORE: 8a3f7d2e-4b1a-5c8d-9e2f-1a3b5c7d9e0f
  AFTER:  9b4c8e3f-5c2b-6d9e-0f3a-2b4c6d8e0f1a
```

The user's explicit feedback during E-03-06 PR B inspection was *"the id should never be shown"* and *"I want content stakeholders can actually read and derive value from."* Phase 1 (PR #89, #90) closed the headline; this ticket closes the diff body.

Phase 1 chose the **read-time resolution** path for entity names because the names live one-hop from the change-log row (look up by `entityId`). The diff body's FK fields are different — they're nested inside a JSONB blob already written. Resolving them at read time is awkward (per-field-type lookup table inside the read service, multiple round-trips per diff). Resolving them at **write time** inside the snapshot helpers is cleaner: the snapshot stores both the ID (audit-trail integrity) and the name (UX legibility) at the moment the change happens.

## Out of scope

- **Backfill of pre-existing snapshots.** Existing rows have raw-UUID-only snapshots. The frontend handles them gracefully (suppresses the UUID, shows a "—" or "(no preview)" sentinel) but does not retroactively resolve names. Resolving names from current DB state is risky because the referent's name may have changed since the snapshot was written.
- **Resolving non-FK fields.** Fields like `name`, `description`, `costPrice`, `status` already render as human-readable values in the diff. No change needed.
- **Audit-history filters by referent name** (e.g., "show me all changes that involved Crossbody Bags") — interesting future work but not in scope.
- **Variant FK fields** — variants currently track no FK fields per `TRACKED_VARIANT_FIELDS`. If variants ever track e.g. `defaultLocationId`, this ticket's pattern extends to it.

## Design

### Snapshot shape change

Today, `snapshotProduct(row)` returns a flat `{ name, description, categoryId, brandId, ... }`. Phase 2 replaces FK ID fields with embedded objects:

```ts
// Before (flat):
{ name: "...", categoryId: "8a3f7d2e-..." }

// After (embedded):
{ name: "...", category: { id: "8a3f7d2e-...", name: "Crossbody Bags" } }
```

- The TS type for `ProductSnapshot` updates to express the new shape.
- `TRACKED_PRODUCT_FIELDS` flips `"categoryId"` → `"category"` (and `"brandId"` → `"brand"`). The diff helper compares whole objects via the existing `JSON.stringify` equality check, so semantic field-level diff still works: if only `category.name` changes but `category.id` stays, that's still detected as a change to the `category` field.
- `<FieldDiff>` gets an extension to render `{ id, name }` objects natively: render the `name`, hide the `id`. Boolean / string / number / null cases stay untouched.

### Resolution at write time

The catalog write commands already have `tx` and the source row in scope when they call `snapshotProduct(row)`. To resolve the referent names, the snapshot helper needs *two* extra reads (or one merged read) inside the same tx:

- `category.name` from `catalog_categories.id = row.categoryId`
- `brand.name` from `catalog_brands.id = row.brandId`

Cleanest API: pass the resolved names into the helper rather than making the helper do the read itself. The command class already loads referent rows for other purposes (e.g., for the response payload); add the lookup if missing.

If two SELECT queries per write feels wasteful, the alternative is to JOIN them into the existing product write query — but that complicates `INSERT ... RETURNING` because Drizzle's RETURNING doesn't natively join. Preferred: keep the lookups separate, batched (`category` and `brand` both as `IN (...)` against a single ID each), tucked inside the snapshot helper signature change. Cost is bounded — write paths happen at human cadence, not query cadence.

### Frontend rendering

`<FieldDiff>` (`apps/web/src/components/admin/catalog/history/field-diff.tsx`):

- Add a case in `<FieldValue>` for `{ id, name }` objects: render the name in the existing `type-data-value` styling. If both `id` and `name` are present, the `id` is omitted from rendering (defensive: never expose UUID in diff).
- For legacy snapshots that store raw UUIDs (no embedded object), detect via `looksLikeUuid()` (already added in commit 3f23554) and replace with a sentinel like `"—"` plus a muted `(legacy)` hint.

### Field label

- `formatFieldLabel("category")` → "Category". Already covered by the camelCase splitter; no override needed.
- Drop the `categoryId` / `brandId` overrides in `FIELD_LABEL_OVERRIDES` since those keys no longer appear in fresh snapshots. Keep them for legacy-row rendering.

## Tasks

1. **Update tracked-fields constants** in `apps/api/src/modules/catalog/catalog-change-tracking.ts` — flip `categoryId` → `category` and `brandId` → `brand` in `TRACKED_PRODUCT_FIELDS`. Update `ProductSnapshot` type accordingly.
2. **Update `snapshotProduct` signature** to accept resolved referent names: `snapshotProduct(row, { categoryName, brandName })`. Return embedded objects.
3. **Update `CatalogProductCommands`** to resolve referent names from the existing query helpers before calling `snapshotProduct`. Pass them through.
4. **Same for `catalog_category`** — tracked field `parentCategoryId` becomes `parentCategory`.
5. **Frontend `<FieldDiff>`** — render embedded `{ id, name }` objects via the new case, suppress legacy UUID values.
6. **Tests:**
   - Snapshot helper unit tests assert the new embedded shape.
   - `<FieldDiff>` renders the name when given the new shape.
   - `<FieldDiff>` falls back gracefully on legacy UUID-only data.
   - Wire-up integration test confirms a category change writes both `category.id` and `category.name` to the snapshot.

## Sequencing

Single PR. ~150 LOC. No backfill needed. Frontend rendering is backwards-compatible with old snapshots.

## How we got here

1. E-03-06 PR A (#86) — read API + 4 admin endpoints.
2. PR #87 — actor avatar URL.
3. PR #88 — option entityRef fix (UUID → name/value).
4. PR #89 — entityName + parentEntityName at read time.
5. PR #90 (PR B) — frontend dedicated pages, History action button, stakeholder-readable header layout, UUID suppression in entityRef.
6. **This ticket** — diff body referent name resolution. Closes the last UUID surface.

## Related

- Parent epic: [E-03-06](./E-03-06-catalog-change-history.md).
- Foundation: E-03-07 catalog change log table + writer.

## Related PRs

- [PR #92](https://github.com/dacostaaboagye/shop-app-v2/pull/92) - `fix(e-03-06): hide catalog history referent ids`

## Shipped evidence

- Merged to `dev` on 2026-05-03.
- CI `validate` passed on PR #92.
- Backend/database, frontend/UX, and QA/Product subagent gates passed after remediation.
- Acceptance closed: foreign-key diffs now render stakeholder-readable names where available, API read snapshots suppress internal UUID IDs, and legacy UUID-only snapshots render safe fallback copy instead of exposing raw IDs.
