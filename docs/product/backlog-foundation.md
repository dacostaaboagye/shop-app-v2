# Backlog Foundation Interpretation

This document captures the architectural intent extracted from the workbook `Building and Refining Product Backlog.xlsx`.

## Problem statement

- The business operates physical stores and warehouses
- Inventory accountability is weak or absent
- Goods get lost or stolen because movements are not traceable
- Supervisors and inspectors are not consistently accountable
- An online shop interacts with warehouse stock for purchases and delivery

## Architectural pillars encoded in the backlog

The workbook is not asking for generic CRUD first. It establishes system primitives that everything else depends on:

1. Immutable ownership ledger
2. Permission-based authorization with immediate revocation
3. Slug and reference infrastructure for public identifiers
4. Stock balance and reservation services with row-level locking
5. Route-level enforcement tooling to stop future drift

## Required sequencing

### Foundation

- `E-01-01` users, authentication, refresh tokens, lockout handling
- `E-00D-01` permission system schema
- `E-00D-02` permission resolution service
- `E-00D-03` slug generation and redirect infrastructure
- `E-00D-04` reference number generation
- `E-00A-01` stock ownership ledger table
- `E-00A-02` ownership query service
- `E-00A-03` assignment and reassignment writers
- `E-00A-04` handover writers and auto-revert job
- `E-00A-05` sales attribution integration
- `E-00A-06` ownership history admin API
- `E-00B-01` stock balance and reservations tables
- `E-00B-02` available stock query
- `E-00B-03` reservation lifecycle service
- `E-00B-04` stock balance initialization and adjustment service
- `E-00B-05` reservation expiry job
- `E-00B-06` stock movement sync service
- `E-00B-07` active reservations admin API
- `E-00C-01` deliveries table
- `E-00C-02` delivery creation service
- `E-00C-03` delivery status transition service
- `E-00C-04` delivery query and assignment service
- `E-00C-05` delivery core API endpoints
- `E-00D-05` portal routing service
- `E-00D-06` permission management admin API
- `E-00D-07` developer enforcement tooling

### Phase 1 surfaces

- authentication UI and portal selection
- user management APIs and admin UI
- location management
- products, search, barcode lookup, and supplier-scoped views
- delivery creation, assignment, and agent portal features

## Non-negotiable workbook constraints

- JWT payloads must not contain roles or permissions
- Protected routes resolve permissions server-side on every request
- Sales attribution must come from ownership history at sale time
- Concurrency-sensitive stock operations require row-level locking
- Public responses use slugs and references rather than raw internal IDs

## Workbook-to-repo interpretation

The updated workbook still uses the original ownership wording:

- `stock_ownership_events` is described with `product_id`
- several `E-00A-*` tickets still reference `effective_to`
- stock tickets describe `stock_balance` and reservations per product-location

The current repo does not implement those details literally. Two accepted repo
decisions still stand:

- append-only ownership chronology from ADR 0003
- stock-bearing identity is `sku_id`, not the higher-level product, from ADR 0010

Those decisions are retained because they keep ownership, balances, and
reservations composable on one quantity-bearing key and avoid adding a row
update path to the ownership ledger.

## Ownership ledger interpretation

Where the workbook says `effective_to`, the repo continues to interpret the
ledger in favor of true append-only ownership events:

- `E-00A-01` remains insert-only with no application `UPDATE` or `DELETE`
- `E-00A-02` resolves ownership from the latest event at or before the query
  timestamp using the `(sku_id, location_id, effective_from DESC)` index
- `E-00A-03` reassignments supersede prior ownership by inserting a new event,
  not by closing a prior row
- `E-00A-04` handover expiry and reversion are modeled as new events, not row
  updates
- Quantity-bearing tickets that say "product" are interpreted in this repo as
  the stock-bearing SKU, so ownership, balances, and reservations compose on a
  shared `sku_id`

In practice, the ledger has no `effective_to` column. Ownership is resolved only
from event ordering.

## Current repo status against the workbook

- complete: `E-01-01`, `E-00D-01` to `E-00D-04`, `E-00A-01` to `E-00A-04`,
  `E-00B-01`
- next highest-priority open slice: `E-00B-02`
- additional open P0s after that: `E-00A-05`, `E-00B-03`, `E-00B-04`,
  `E-00B-05`, `E-00B-06`
- open P1s visible in the workbook: `E-00A-06`, `E-00B-07`, `E-00D-05`,
  `E-00D-06`
- `E-00D-07` remains lower priority in the workbook, but should land before the
  first broad Phase 1 feature work
