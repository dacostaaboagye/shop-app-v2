---
id: E-03-06
title: View the change history of any product or variant
status: refined
priority: P1
domain: full-stack
owner: claude
parents: [E-03-07]
acceptance:
  - Admin / catalog-manager users can view the chronological change history of any product, variant, brand, or category from its detail page.
  - History reads include the entity's own changes AND the changes of any child entities (variant changes appear on the parent product's history, option-value changes appear on the parent product's history).
  - Each entry shows operation (created / updated / archived / restored / deleted), actor (user name + slug), occurred-at timestamp, and a human-readable diff of changed fields with before / after values.
  - History is paginated (cursor-based) and ordered most-recent-first.
  - Mobile-friendly: the diff view stacks before / after vertically on small screens; desktop renders side-by-side.
  - Endpoints are gated by a `catalog:read-history` permission registered in the access-control seed.
  - No regressions to existing product / brand / category detail pages — the history is a new tab, not a replacement.
size: medium
---

## Why

E-03-07 ships the immutable `catalog_change_log` table and wires every catalog write to emit rows. Until that data is readable, it's just write-only ledger weight. This epic exposes the data: a read service + endpoints + an admin UI tab on each catalog entity's detail page.

The acceptance criterion in `Backlog Audit` is "User views the chronological change history of any product or variant." The current state per the audit is "Partial — audit log capture in place; UI view that renders human-readable change diffs is still minimal" — which has now flipped to "audit log fully captures via E-03-07; UI view does not yet exist." This epic closes that gap.

## Out of scope

- **Activity feed across all catalog changes** (e.g. "global recent activity" view) — only per-entity history this epic.
- **Restore / undo from the history view** — read-only. Restoration of an archived product uses the existing status update, not a "rewind" button.
- **Diff'ing media assignment changes pixel-by-pixel** — `mediaAssignments` field changes show as a JSON snapshot diff; thumbnails and media UX are out of scope.
- **Filtering by operation / actor / date range** — first cut is reverse-chronological with pagination only. If the access control or compliance team asks for filters, that's a follow-up.
- **Worker / supplier / agent portal exposure** — admin-only this epic. Other portals do not need a history view.
- **CSV / PDF export of history** — a follow-up if anyone asks. The data is in the table.
- **Backfilling pre-E-03-07 rows** — same as the parent epic: history starts at the E-03-07 deploy date.

## Design

To be authored by `node-backend-systems-architect` (PR A) and `frontend-ui-architect` (PR B) at the design stage. Anticipated shape:

### Read service + endpoints (PR A)

`apps/api/src/modules/catalog-change-log/` — extend the existing module:

- `catalog-change-log-read.service.ts` — service layer.
- `postgres-catalog-change-log-read.repository.ts` — postgres implementation.
- `catalog-change-log.routes.ts` — route registration.

Two read paths:

1. **By entity**: `(entityType, entityId)` — uses index `catalog_change_log_entity_idx`. Returns just that entity's rows.
2. **By parent**: `(parentEntityType, parentEntityId)` — uses partial index `catalog_change_log_parent_idx`. Returns all child changes (e.g. for a product, returns its variants' and options' changes).

Endpoints (admin only, gated by `catalog:read-history`):

- `GET /api/admin/catalog/products/:slug/changes` — combines entity + parent reads (product + variants + options + option-values), merge-sorted by `occurredAt DESC`.
- `GET /api/admin/catalog/variants/:slug/changes` — variant-only history.
- `GET /api/admin/catalog/brands/:slug/changes` — brand-only.
- `GET /api/admin/catalog/categories/:slug/changes` — category-only.

Each accepts `?cursor=<base64>&limit=<n>` (cap 50). Response shape: `{ entries: ChangeLogEntry[], nextCursor: string | null }`.

### Frontend (PR B)

New tab on the existing admin detail pages:

- `apps/web/src/app/admin/products/[slug]/page.tsx` — add `<HistoryTab>` to the existing tab strip.
- `apps/web/src/app/admin/products/brands/[slug]/page.tsx` — same.
- `apps/web/src/app/admin/products/categories/[slug]/page.tsx` — same.

Components (`apps/web/src/components/catalog-history/`):

- `<CatalogHistoryList>` — query hook + pagination + empty state.
- `<ChangeLogEntry>` — single card: operation badge, actor, timestamp, expandable diff.
- `<FieldDiff>` — `before` / `after` rendering. Strings get inline diff, booleans / enums get badges, JSON gets pretty-printed code blocks.

Mobile-first: card stacks vertically by default. Desktop @ ≥768 expands the diff inline.

## Tasks (PR A — backend)

1. Add `catalog:read-history` permission to the access-control seed and to the role grants for `admin` and `catalog-manager` roles.
2. Build `CatalogChangeLogReadService` + postgres read repository. Cursor pagination using `(occurredAt, id)` composite cursor.
3. Add 4 routes (products / variants / brands / categories), each gated by `catalog:read-history` via `config.access`.
4. Extend `@shop/contracts` with the response shape: `ChangeLogEntry`, `ChangeLogPage`.
5. Inject the new service into the existing `create-catalog-change-log-runtime.ts`.
6. Tests:
   - Service: returns rows in `occurredAt DESC` order, paginates correctly across the cursor boundary, includes parent + child rows for the product endpoint.
   - Permission: a user without `catalog:read-history` gets 403.
   - Empty: a never-touched entity returns `entries: []`, `nextCursor: null`.

## Tasks (PR B — frontend)

7. React Query hook `useCatalogChangeLog({ entityType, slug })` against the four new endpoints. Infinite query for "load more".
8. `<CatalogHistoryList>` + `<ChangeLogEntry>` + `<FieldDiff>` components. Use the existing design-system primitives (`Card`, `Badge`, etc.) — no raw Tailwind palette, no `space-x-*` per `agent-rules.md`.
9. Add `<HistoryTab>` to the three admin detail pages. Permission-gate the tab with the same `catalog:read-history` permission so a manager without it doesn't see it.
10. Loading skeleton, empty state, and "load more" pagination.
11. Tests:
   - Hook: pagination + error states.
   - Component: renders an `archived` row with the right badge; renders a `before / after` diff for an `updated` row; mobile stacks; desktop side-by-side.

## Test plan

- **Backend integration** — exercise each endpoint against a seeded product with a known sequence of writes (create → update name → archive → variant create → variant update → variant delete → product delete cascade); confirm the response order matches the chronological event order.
- **Permission** — log in as an admin with `catalog:read-history`, see history; log in as a manager without it, get 403; UI tab does not render.
- **Mobile** — exercise the history view on a 375px viewport; before / after stacks; "load more" still tappable.
- **Cascade visibility** — archive a product and confirm the history shows the product `archived` row PLUS one row per affected variant, all with the same `occurredAt`.
- **Empty state** — newly created product with no further edits shows just the `created` row, no spinner stuck.
- **Long history** — synthetic 500-entry history; cursor pagination works through to the end; final page returns `nextCursor: null`.
