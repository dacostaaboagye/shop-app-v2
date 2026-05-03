---
id: E-00C-04
title: Provide service functions for delivery assignment and queries
status: built
priority: P0
domain: backend
owner: claude
parents: [E-00C-03]
acceptance:
  - findById(deliveryId) returns the full DeliveryRecord with items, or null when not found.
  - listDeliveriesByAgent(agentUserId, filters?) returns deliveries currently assigned to the agent, ordered newest-first.
  - listByLocation(locationId, filters?) returns deliveries originating at the location, ordered newest-first.
  - List queries cap result set at 50 by default, 200 max — no unbounded reads.
  - Status filter is honored when supplied (intersection semantics).
  - Cross-domain reads go through DeliveryQueryService; no direct table access from outside the deliveries module.
size: small
---

## Why

E-00C-01..03 shipped delivery creation and status mutations. The frontend portals (E-15 agent portal, E-12 manager surface, future delivery query screens) need to read deliveries by agent and by location. This epic provides the read service so those consumers don't reach into the table directly.

## Out of scope

- Pagination cursors — capped limit only. Cursor-based pagination is a follow-up if list sizes grow past the cap.
- Filtering by date range, source type, customer reference. Add when a UI demands them.
- Status-history reads — defer until E-00C-LEDGER-OPS materialises a history view.

## Design

Light tier, no architect call. New `DeliveryQueryService` interface implemented directly by `PostgresDeliveryQueryRepository` (interface + impl in one for read-only queries). Three methods: `findById`, `listByAgent`, `listByLocation`. Default limit 50, hard cap 200.

## Tasks (one commit)

1. `delivery-query.contracts.ts` — `DeliveryQueryService` interface + input types.
2. `postgres-delivery-query.repository.ts` — implementation with `attachItems` helper that batch-loads items via a single `IN (...)` query.
3. Runtime: expose `deliveryQueryService`.
