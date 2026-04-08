# Inventory Ownership Module

Owns:

- stock ownership ledger events
- assignment, reassignment, and handover workflows
- ownership history queries
- sales attribution lookups

This module models accountability, not stock quantity. Quantity balances belong to the stock module.
Ownership rows are keyed by stock-bearing SKU so accountability and stock
availability can compose on the same inventory identity.

## Current foundation status

- `E-00A-01`: ledger schema exists in `stock_ownership_events`
- `E-00A-02`: ownership query service resolves current owner, owner-at-time, and
  chronological history
- `E-00A-03`: assignment and reassignment writers append new rows only; no prior
  event is ever updated
- `E-00A-04`: handover initiation, chaining, ending, and auto-revert are modeled
  as append-only event inserts

## Query rules

- the authoritative owner is the latest event at or before the query timestamp
- every lookup is keyed by `sku_id` plus `location_id`, not by parent product
- `handover_in` supersedes prior assignment because it is the latest event
- `reverted` restores ownership through a new row, not by mutating prior rows
- the ledger does not use an `effective_to` column
- malformed latest states, such as `handover_out` without a later
  `handover_in`, resolve to `null` with a warning instead of throwing
- history remains chronological and append-only

## Write rules

- fresh assignment inserts a single `assigned` row
- reassignment inserts a single `reassigned` row
- duplicate assignment to the same current worker is a no-op
- reassignment is blocked while the latest event represents an active handover
- no writer in this module issues `UPDATE` against `stock_ownership_events`
- handover initiation and chaining insert paired `handover_out` and `handover_in`
  rows in one transaction
- handover end and auto-revert insert a single `reverted` row and never mutate
  prior handover rows

## Primary code paths

- service: `ownership-query.service.ts`
- service: `ownership-event-write.service.ts`
- service: `ownership-handover.service.ts`
- postgres adapter: `postgres-ownership-query.repository.ts`
- postgres adapters: `postgres-ownership-event.repository.ts`, `postgres-ownership-handover.repository.ts`
