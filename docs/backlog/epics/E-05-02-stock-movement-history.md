---
id: E-05-02
title: Stock movement history for inventory traceability
status: shipped
priority: P1
domain: full-stack
owner: codex
parents: [E-05-01]
acceptance:
  - Admin users can view a paginated stock movement history across locations with filters for location, SKU/search text, movement type, source type, and date range.
  - Manager users can view stock movement history only for locations where they hold `stock.view`; out-of-scope locations are rejected server-side.
  - Movement rows show SKU, product/variant names, location, signed quantity delta, movement type, reason/note when present, occurred time, actor display when available, and a safe source reference.
  - Public API and UI responses do not expose internal surrogate IDs or internal-only movement source keys.
  - Supplier receipt movements are traceable by supplier procurement reference even when the internal stock movement source key contains line identity for idempotency.
  - Empty, loading, error, and filtered-no-result states are handled in the admin and manager UI.
  - Movement history is read-only; corrections remain separate stock-count, stock-take, return, transfer, or receipt workflows.
size: medium
---

## Why

E-05-01 made supplier goods receipts update stock through the append-only `stock_movements` ledger. Operators now need a way to answer the next practical question: "Why did this location's stock change?"

Without a movement-history surface, stock balances are correct but hard to audit. Admins and managers must infer changes from supplier activity, stock takes, transfer screens, sales, and returns. This slice exposes the movement ledger as an operational trace so support, warehouse, and finance users can reconcile stock changes without database access.

## Current implementation context

Existing foundations:

- `stock_movements` is append-only evidence for on-hand stock changes.
- Movement writes already exist for sales, returns, opening stock, manual counts, stock takes, transfers, and supplier receipts.
- `stock_movements` carries `sourceType` and `sourceKey` for idempotency.
- `stock_balances` screens exist for admin and manager portals.
- Admin stock read routes use `inventory.read`; manager stock read routes use location-scoped `stock.view`.

Gap:

- There is no public movement-history contract, API, or UI.
- Several `sourceKey` values are internal implementation keys, including supplier receipt keys that intentionally contain line identity. These must not be exposed directly in public responses.

## Out of scope

- Editing, voiding, or deleting stock movements.
- Backfilling human-friendly source references for every historical movement.
- Reconciliation reports, exports, or financial valuation.
- New transfer lifecycle states from ADR 0011.
- Worker portal movement history.
- Realtime movement updates.

## Design direction

Movement history should be a read model over the existing append-only ledger.

Implementation shape:

- Add contracts for movement list query/response under the stock contract area.
- Add `GET /api/admin/stock/movements`.
  - Permission: `inventory.read`.
  - Scope: global admin read.
  - Filters: `locationSlug`, `q`, `sku`, `movementType`, `sourceType`, `dateFrom`, `dateTo`, `page`, `pageSize`.
- Add `GET /api/manager/stock/movements`.
  - Permission: `stock.view` with `any_active` route metadata.
  - Requires `locationSlug`.
  - Handler resolves location and asserts `stock.view` for that location before querying.
- Add one query repository that joins:
  - `stock_movements`
  - `locations`
  - `product_variants`
  - `catalog_products`
  - `users` for optional actor display
- Use safe source mapping:
  - `supplier_procurement_receipt` -> parse procurement reference prefix before the first `:`.
  - `stock_take` -> parse stock-take reference prefix before the first `:`.
  - `admin_count` / `opening_stock` -> source reference only when already public-safe; otherwise return `null`.
  - `delivery_transfer`, `supply_request`, `pos_sale`, `pos_return`, sale-line, and return sources -> expose only known public references or `null` until a mapper is added.
- Sort by `occurredAt desc`, then stable movement row order for pagination consistency.
- UI surfaces:
  - `/admin/stock/movements`
  - `/manager/stock/movements`
  - Add stock-nav entries near balances, reservations, and stock takes.
  - Use a dense table optimized for scanning with signed-delta styling, compact filters, and source-reference chips.

## Security and data integrity notes

- The route boundary enforces read permissions; frontend navigation is not access control.
- Manager location scoping must be rechecked in the handler from the loaded/resolved location, not only by trusting the submitted slug.
- Public responses must not include `stock_movements.id`, `skuId`, `locationId`, `createdBy`, raw `sourceKey`, or procurement line IDs.
- Since the ledger is append-only, this slice must not add any correction endpoint. Users who find an error must use existing stock count/take/receipt/return workflows.

## Shipped evidence

- Refinement PR: https://github.com/dacostaaboagye/shop-app-v2/pull/163
- Implementation PR: https://github.com/dacostaaboagye/shop-app-v2/pull/165
- Merge commit: `3a31c99a2344368279b6027d5d7d773732070177`
- Implementation:
  - Added public stock movement history contracts and contract tests.
  - Added read-only admin and manager API routes with manager location-scope enforcement.
  - Added a stock-owned query repository that maps source keys to safe public source references.
  - Added admin and manager movement-history pages with filters, pagination, loading, empty, error, desktop table, and mobile card states.
  - Added stock movement navigation while preserving admin/manager portal isolation.
- Verification:
  - `pnpm guard`
  - `pnpm --filter @shop/contracts test -- stock-movements.test.ts`
  - `pnpm --filter @shop/api exec tsx --test test/stock-movement-source-reference.test.ts test/stock-movement-history.routes.test.ts`
  - `pnpm --filter @shop/web exec tsx --test src/components/stock/stock-movement-history.support.test.ts`
  - `pnpm --filter @shop/web exec tsx --test src/components/system/portal-shell-config.test.ts`
  - `pnpm verify`
  - GitHub CI `validate` passed on PR #165.
  - Playwright checked `/admin/stock/movements` and `/manager/stock/movements` across desktop and mobile layouts.

## Tasks

1. Add stock movement history contracts.
2. Add movement query repository with safe source-reference mapping.
3. Add admin and manager movement routes with route metadata and manager location-scope enforcement.
4. Wire the stock runtime and internal API docs group if needed.
5. Add React Query fetch helpers and route pages for admin and manager movement history.
6. Add stock navigation entries.
7. Add focused tests for contract validation, repository mapping, route authorization, and UI support states.

## Test plan

- Given mixed movement rows, admin history returns newest movements first with SKU/location/product metadata and signed deltas.
- Given a supplier receipt movement source key that includes line identity, the response exposes only the supplier procurement reference.
- Given a manager queries a location they can view, movement history returns only that location's movements.
- Given a manager queries an out-of-scope location, the API returns 403 before querying movement rows.
- Given filters are provided, results narrow by location, SKU/search, movement type, source type, and date range.
- Given there are no movements, the UI shows an actionable empty state.
- Given the API fails, the UI shows a safe retryable error state.
- Given a response is inspected, it contains no raw internal IDs or internal-only source keys.

## UAT scenarios

1. Admin opens `/admin/stock/movements`, filters by Accra Central Store and `goods_receipt`, and sees the supplier receipt from PR #159 traceable to its procurement reference.
2. Manager opens `/manager/stock/movements`, selects one managed location, and confirms only that location's stock changes appear.
3. Manager tries to load a location they do not manage and sees an access-denied state.
4. Admin searches by SKU and verifies the chronological trail includes opening stock, stock counts, stock takes, transfers, sales, returns, and supplier receipts where data exists.

## Related PRs

- [PR #163](https://github.com/dacostaaboagye/shop-app-v2/pull/163) - `docs(e-05-02): refine stock movement history`
- [PR #165](https://github.com/dacostaaboagye/shop-app-v2/pull/165) - `feat(e-05-02): add stock movement history`
- [PR #167](https://github.com/dacostaaboagye/shop-app-v2/pull/167) - `docs(e-05-02): close stock movement history`
