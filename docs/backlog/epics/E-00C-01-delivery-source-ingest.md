---
id: E-00C-01
title: Create delivery items from any source in a consistent format
status: planned
priority: P0
domain: backend
owner: claude
parents: []
acceptance:
  - A POS sale flagged for delivery produces a delivery + delivery items with source_type="pos_sale" and source_reference set to the invoice reference, without re-decrementing stock.
  - An online order confirmation produces a delivery + delivery items with source_type="online_order" and source_reference set to the order reference; stock is reserved (not decremented) at creation.
  - A transfer initiation produces a delivery + delivery items with source_type="transfer" and source_reference set to the transfer reference; quantities move from origin onHand into the in-transit bucket via the existing stock-movement-sync module.
  - The persisted delivery row shape is identical across all three sources — same columns, same item structure; only source_type / source_reference / origin / destination differ.
  - Every delivery item is created with a positive integer quantity and a unique itemReference; the schema check + unique index reject zero/negative quantities and duplicates.
  - Calling the creation service twice with the same (source_type, source_reference) is idempotent — the second call returns the first delivery, never inserts a duplicate.
  - Creation runs in a single DB transaction spanning the delivery row, all delivery_items rows, and any stock reservation/movement; partial writes are impossible.
  - Public-facing identifiers on the created delivery and items are publicUuids; raw DB ids never leak across the module boundary.
  - Authorization is enforced at the route boundary via config.access; callers without the relevant create-delivery permission for the origin location are rejected before service code runs.
  - Cross-domain reads (sale lookup, order lookup, transfer lookup, stock check) go through service interfaces in packages/contracts, never direct table reads.
size: medium
---

## Why

Deliveries today have a schema and a placeholder module but nothing that creates a delivery from a real upstream event. POS sales, online orders, and inter-location transfers each carry different inputs (invoice + customer address, order + fulfillment location, two internal locations + manager intent) but downstream consumers — agent assignment, status lifecycle, the delivery agent portal, the B2B portal, online buyer accounts — all need to read one consistent shape.

This epic is the single ingest seam. Once it exists, every other delivery-related epic can assume "if it's in `deliveries`, it has a known source, a known origin, a known destination, and a list of items with positive quantities." Without it, every consumer has to special-case where the row came from, and stock effects scatter across modules.

Unblocks E-00C-02..05 (status lifecycle, agent assignment, service functions, REST API) and four phase-2/3 epics (E-12 B2B portal, E-14 online fulfilment, E-15 agent portal, E-16 online buyer accounts).

## Out of scope

- Status lifecycle transitions beyond `draft` on creation (E-00C-02 owns assigned → in_transit → completed → cancelled).
- Delivery agent assignment logic (E-00C-03).
- Domain service surface beyond creation — read APIs, listing, filtering (E-00C-04).
- REST routes and contracts (E-00C-05). This epic delivers the service, not the HTTP edge.
- Dispatch flow, receipt confirmation, and the stock movements that fire on those transitions.
- Customer-facing notifications, ETA, tracking.
- Online checkout integration end-to-end — this epic accepts an already-confirmed online order id; the actual E-14 checkout/payment flow is a separate epic. If E-14 isn't built, the `online_order` branch is wired but exercised only by tests until E-14 lands.
- Delivery agent portal UI (E-15), B2B portal (E-12), online buyer account UI (E-16).
- Backfilling deliveries for historical sales/transfers.
- Multi-shipment splits for one source record (one source → one delivery, in this epic).

## Acceptance

- A POS sale flagged for delivery produces a delivery + delivery items with `source_type="pos_sale"` and `source_reference` set to the invoice reference, without re-decrementing stock.
- An online order confirmation produces a delivery + delivery items with `source_type="online_order"` and `source_reference` set to the order reference; stock is reserved (not decremented) at creation.
- A transfer initiation produces a delivery + delivery items with `source_type="transfer"` and `source_reference` set to the transfer reference; quantities move from origin onHand into the in-transit bucket via the existing stock-movement-sync module.
- The persisted delivery row shape is identical across all three sources — same columns, same item structure; only `source_type` / `source_reference` / origin / destination differ.
- Every delivery item is created with a positive integer quantity and a unique `itemReference`; the schema check + unique index reject zero/negative quantities and duplicates.
- Calling the creation service twice with the same `(source_type, source_reference)` is idempotent — the second call returns the first delivery, never inserts a duplicate.
- Creation runs in a single DB transaction spanning the delivery row, all `delivery_items` rows, and any stock reservation/movement; partial writes are impossible.
- Public-facing identifiers on the created delivery and items are publicUuids; raw DB ids never leak across the module boundary.
- Authorization is enforced at the route boundary via `config.access`; callers without the relevant create-delivery permission for the origin location are rejected before service code runs.
- Cross-domain reads (sale lookup, order lookup, transfer lookup, stock check) go through service interfaces in `packages/contracts`, never direct table reads.

## Edge cases

- **Source record doesn't exist** — `source_reference` points at no invoice / no order / no transfer. Reject with a domain error before any write; do not create an orphaned delivery.
- **Source record exists but is in a non-eligible state** — POS sale was voided, online order was cancelled before fulfillment, transfer was already completed. Reject with a state-specific domain error; existing delivery for this source (if any) is unaffected.
- **Transfer quantity exceeds origin onHand (after reservations)** — reject before any partial write; surface the shortfall per SKU. Stock module is the authority.
- **Partial fulfillment requested** — out of scope (one source → one delivery for the full quantity). Reject any input that asks for a partial.
- **Concurrent creation for the same source** — two simultaneous calls with the same `(source_type, source_reference)`. Resolved by a unique constraint on the pair plus retry-on-conflict; first writer wins, second returns the same delivery. Must hold under transaction isolation.
- **Idempotency on retry** — same `(source_type, source_reference)` returns the existing delivery; same response shape regardless of insert vs read.
- **Origin and destination resolve to the same location** — only meaningful for transfers; reject as invalid input.
- **Destination is an external customer, not a location** — for POS / online sources, `destinationLocationId` is null and `destinationSnapshot` (jsonb) carries the address. Validate that snapshot is non-empty in that case.
- **Item references collision** — `itemReference` has a unique index. The service must generate references that won't collide (e.g., scoped to source) and must surface collision as a retry, not a 5xx.
- **SKU not stocked at origin** — for transfer, the SKU has no balance row at origin. Treat as zero on hand, reject with shortfall — same path as quantity > on-hand.
- **Source quantity zero** — POS sale with all-zero lines (shouldn't happen but defend). Reject with explicit error; don't write a delivery with no items.
- **Stock module fails mid-creation** — transfer reservation succeeds but delivery insert fails (or vice versa). Single transaction must roll both back; verify that the stock-movement-sync module participates in or is compensated by the same transaction boundary.

## Open questions for design

These are open questions the backend architect needs to resolve in Stage 2:

1. **Schema gap — source typing.** The shipped `deliveries` table has no `source_type` or `source_reference` columns. Architect must decide:
   - Add `source_type` (enum: `pos_sale`, `online_order`, `transfer`) + `source_reference` (varchar) as nullable-then-backfilled, or notNull with a unique composite index `(source_type, source_reference)` for idempotency.
   - Whether the unique constraint should be partial (e.g., excluding cancelled deliveries) so a re-creation after cancel is allowed.
   - Migration strategy given the table has no production rows yet.

2. **Sync vs event-driven creation.** Should POS / online / transfer modules call the delivery creation service synchronously inside their own transaction, or emit a domain event the deliveries module subscribes to? Existing modules (`inventory-ownership`, `stock-movement-sync`) use sync.

3. **Transaction boundary with the stock module.** For transfers, the delivery insert and the stock movement (onHand → in-transit) must be atomic. Options: (a) deliveries service opens the tx and calls into stock-movement-sync via an injected interface that participates in it; (b) deliveries service emits a movement intent that stock-movement-sync executes in the same tx via a shared unit-of-work.

4. **Idempotency key shape.** Is `(source_type, source_reference)` enough, or do we need a caller-supplied idempotency key for the cases where one source legitimately produces multiple deliveries (future split-fulfillment, returns)? E-00C-01 says one delivery per source; if that's likely to relax in E-13/E-14, design the key to extend without a migration.

5. **Address snapshot shape.** `destinationSnapshot` is `jsonb`. Should we standardise its shape now (street/city/region/postalCode/country/contactName/contactPhone) in `packages/contracts` so the agent portal and online buyer flow read the same thing later, or leave it free-form for this epic? Recommendation from PO: standardise now — cheap, prevents drift.

6. **Service interface placement.** Per the cross-domain rule, sales / online / transfers must call deliveries through `packages/contracts`. One `DeliveryCreationService` interface with three methods (`createFromPosSale`, `createFromOnlineOrder`, `createFromTransfer`), or one method that takes a discriminated-union input?

7. **Permission model.** Confirm whether `config.access` keys are per source_type or one umbrella permission, and whether origin-location scoping (per `rules-location-scoping`) applies uniformly.

8. **`createdBy` semantics for system-triggered creations.** When a paid online order auto-creates a delivery with no human in the loop, what fills `createdBy`? A system user, the payer's user id, null with a `createdBySystem` flag?

## Design

Author: `node-backend-systems-architect`. Aligns with ADRs 0001 (modular monolith), 0003 (append-only ledgers), 0004 (route enforcement), 0011 (stock transfer workflow), 0012 (platform event backbone), 0013 (durable outbox).

### 1. Schema additions — `packages/database/src/schema/deliveries.ts`

Add a pg enum and three columns; tighten existing columns; add the idempotency unique index, a lookup index, and two check constraints. Single migration; table has zero rows so we go straight to `notNull` everywhere.

- New enum `delivery_source_type` with values `pos_sale`, `online_order`, `transfer`.
- New columns on `deliveries`: `sourceType` (notNull), `sourceReference varchar(64)` (notNull), `destinationKind varchar(16)` (notNull, values `"location" | "external"`).
- Tighten `deliveries.created_by` to `notNull`.
- Tighten `delivery_items.itemReference` to `notNull` (existing unique index stays).
- New `uniqueIndex("deliveries_source_unique")` on `(sourceType, sourceReference)` — full index, not partial.
- New `index("deliveries_source_lookup_idx")` on `(sourceType, sourceReference)` — supports the read-before-insert path inside the tx.
- Check `deliveries_destination_kind_consistent`: when `destination_kind = 'location'` then `destination_location_id IS NOT NULL`; when `destination_kind = 'external'` then `destination_location_id IS NULL AND destination_snapshot IS NOT NULL`.
- Check `deliveries_origin_destination_distinct`: `destination_location_id IS NULL OR destination_location_id <> origin_location_id`.

**Forward-compat for split fulfillment:** if E-13/E-14 require one-source-many-deliveries later, add nullable `splitKey varchar(40)` and rebuild the unique index as `(sourceType, sourceReference, splitKey)` — additive, no data migration.

### 2. Idempotency model

Key: `(sourceType, sourceReference)` only. No caller-supplied key in this epic.

DB unique index is the source of truth. Application does a read-first inside the same tx, then INSERT, with one retry on `pg` error `code = '23505' AND constraint = 'deliveries_source_unique'`. On retry, fetch the winner's items and return `status: "noop"` — never re-mint reference numbers, never re-emit the platform event.

Mismatch policy: if an existing delivery is found for the same key but the request items / origin differ, reject with `DeliverySourceConflictError` (409). Buggy retries that changed the items must NOT silently succeed.

### 3. Service interface — `packages/contracts/src/deliveries.ts`

Three methods, not one with a discriminated union — per-source authorization, per-source input validation, per-source test seams all diverge.

```ts
interface DeliveryCreationService {
  createFromPosSale(input: { invoiceReference: string; destination: DeliveryAddressSnapshot; createdBy: string; now?: Date }): Promise<CreatedDelivery>;
  createFromOnlineOrder(input: { orderReference: string; destination: DeliveryAddressSnapshot; createdBy: string; now?: Date }): Promise<CreatedDelivery>;
  createFromTransfer(input: { transferReference: string; createdBy: string; now?: Date }): Promise<CreatedDelivery>;
}
```

Internally, all three funnel into a private `composeDelivery` helper that owns the tx, idempotency read, source-port lookup, eligibility check, item-reference minting, per-source stock branch, the inserts, and the unique-violation retry.

Public response schemas live in `packages/contracts/src/deliveries.ts`. Internal record types (`DeliveryRecord`, `DeliveryItemRecord`) live in `apps/api/src/modules/deliveries/delivery.types.ts`.

### 4. Transaction boundary with stock module

The deliveries service owns the Drizzle tx and calls `createPostgresStockReservationTransaction(tx)` from stock — the same factory pattern `postgres-reservation-lifecycle.repository.ts` already exposes. No new shared unit-of-work abstraction.

Per source:
- **`pos_sale`**: stock was already decremented at sale completion. Tx contains `INSERT deliveries`, `INSERT delivery_items` ×N. No stock side effects.
- **`online_order`**: tx contains the inserts plus per-item `insertReservation({ sourceType: "delivery", sourceKey: <delivery.id>, … })` and `adjustStockBalance({ reservedDelta: +qty })`. Assumes no pre-existing reservation (E-14 isn't built); flagged to PO as a future revisit.
- **`transfer`**: tx contains the inserts plus per-item `insertReservation({ sourceType: "delivery", sourceKey: <delivery.id>, locationId: origin })` and `adjustStockBalance({ onHandDelta: -qty, reservedDelta: +qty })`. Origin availability checked via `getStockAvailabilitySnapshot({ lock: "for_update" })` *before* inserting the reservation; shortfall raises `DeliveryInsufficientOriginStockError` with per-SKU detail.

Movements (`transfer_out`/`transfer_in` rows) fire on dispatch / receipt, not at creation — that's E-00C-02 territory.

### 5. Sync vs event-driven

Synchronous in-process call. POS / online / transfer modules call `DeliveryCreationService.createFromX(...)` directly inside their flow. ADR 0012 events are notifications/projections, not commands — using them as commands would force a saga the AC forbids.

Post-commit, the service publishes a `delivery.created` platform event via the existing `PlatformEventPublisher`, written to `platform_event_deliveries` and propagated by the durable outbox loop (ADR 0013). `status: "noop"` does NOT emit a duplicate event.

### 6. Cross-domain contracts

New `packages/contracts/src/deliveries.ts` exports:
- `deliverySourceTypeSchema`, `deliveryAddressSnapshotSchema`, `deliveryItemResponseSchema`, `deliveryResponseSchema`.
- Three request schemas (`createDeliveryFromPosSaleRequestSchema`, `createDeliveryFromOnlineOrderRequestSchema`, `createDeliveryFromTransferRequestSchema`).
- Read-port interfaces: `PosSaleDeliverySourcePort`, `OnlineOrderDeliverySourcePort`, `TransferDeliverySourcePort`. Adapters live in the originating modules; eligibility rules live in the deliveries module's policy file.
- Error code constants: `delivery_source_not_found`, `delivery_source_state_invalid`, `delivery_source_conflict`, `delivery_insufficient_origin_stock`, `delivery_invalid_destination`, `delivery_partial_unsupported`.

`AppError` subclasses for each in `apps/api/src/modules/deliveries/delivery-errors.ts` per the existing `_core/errors/app-error` pattern.

Online-order port has no implementing module today (E-14 isn't built). Ship a stub adapter that always returns `null`; production startup logs a structured warning if the stub is wired.

### 7. Permission model

Three per-source permission keys, route-level only, with origin-location scoping:

| Source | Permission key | Scope |
|---|---|---|
| `pos_sale` | `deliveries.create_from_sale` | `any_active` at sale's origin location |
| `online_order` | `deliveries.create_from_online_order` | system-actor only (server-side actor check) |
| `transfer` | `deliveries.create_from_transfer` | `any_active` at transfer's origin location |

Service does NOT re-check permissions (per ADR 0004); it does validate that the resolved origin location matches the source record's location as a domain-invariant check.

The umbrella alternative (`deliveries.create`) loses information — a worker who can complete POS sales should not automatically convert any transfer to a delivery. Three keys is correct; one-time cost in seed data.

### 8. `createdBy` semantics

Tighten `created_by` to `notNull`. For user-triggered creations, it's the acting user's uuid. For system-triggered creations (online order auto-fulfilment), it's a designated system user uuid loaded from `API_SYSTEM_USER_ID` env at runtime composition. Add the system user to seed bootstrap; filter from human-user listings.

Rejected: nullable + `createdBySystem` flag (two-column truth state); using payer uuid (payer is a customer, often guest); leaving nullable (audit posture weakens).

### 9. Module layout — `apps/api/src/modules/deliveries/`

```
README.md                                       overview, ADR pointers, system-user note
create-deliveries-runtime.ts                    composition root (mirrors createSalesRuntime)
delivery.types.ts                               internal records (DeliveryRecord, DeliveryItemRecord)
delivery-creation.contracts.ts                  internal service interface
delivery-creation.service.ts                    public surface — three thin methods
delivery-creation.compose.ts                    private composeDelivery — shared tx/idempotency body
delivery-source.policy.ts                       eligibility rules per source state (pure)
delivery-source-eligibility.test.ts
delivery-errors.ts                              AppError subclasses
delivery-item-reference.ts                      mints item refs via ReferenceNumberService
postgres-delivery-write.repository.ts           withTransaction + createPostgresDeliveryWriteTransaction(tx)
postgres-delivery-write.repository.test.ts
postgres-delivery-source-lookup.repository.ts   find existing by source inside a tx
pos-sale-delivery-source.adapter.ts
online-order-delivery-source-stub.adapter.ts    placeholder until E-14
transfer-delivery-source.adapter.ts
delivery-creation.service.test.ts
```

All files stay under 250 LOC; tests under 350.

### 10. Test surface

Trickiest invariants:

1. **Concurrent insert / unique violation retry** — integration test with two real connections racing the same `(source_type, source_reference)`; assert exactly one delivery row, loser returns winner's items.
2. **Transactional rollback under partial stock failure** — for transfer, force the reservation insert to throw mid-tx; assert no delivery row, no reservation row, no balance change.
3. **Item-reference uniqueness across deliveries** — back-to-back creations; all `delivery_items.itemReference` values distinct and conform to the `DEL-YYYYMMDD-…` format.
4. **`createdBy` always points to a real user** — FK enforcement + system-user is seeded.
5. **State strings only interpreted in `delivery-source.policy.ts`** — static-grep guard test.

Coverage levels: integration tests (real Postgres) for the repository + the full service end-to-end per source. Unit tests with port + tx fakes for the policy, the service-level error mapping, and idempotency-mismatch path.

### 11. Open follow-ups (architect → PO)

1. **Online-order pre-existing reservation** — when E-14 ships, the checkout will already have reserved stock. Decide adopt-by-rekey vs replace. E-00C-01 ships assuming no pre-existing reservation.
2. **Trigger surface for `createFromOnlineOrder`** — HTTP route vs queue worker vs fired inside payment-confirmation tx. Defer to E-14.
3. **Partial unique-index after-cancel** — pushed back; if PO insists, redesign as a separate "supersede" event flow per ADR 0003, not a partial index.
4. **Three permission keys vs one umbrella** — recommended three; confirm before E-00C-05 seed-data work.

## Tasks

Eight commit-sized tasks, sequential. Each task lands as one commit on the build branch with the epic id as the conventional-commit scope, after `pnpm guard` + the affected tests pass locally.

1. **Schema migration** — `packages/database/src/schema/deliveries.ts` adds the enum + columns + indexes + checks; tighten `created_by` and `itemReference` to notNull; generate Drizzle migration; update `packages/database/src/schema/index.test.ts` assertions. Tests: schema test confirms columns + constraints exist.
2. **Contracts** — `packages/contracts/src/deliveries.ts` with the address snapshot, source-type enum, request schemas, response schemas, port interfaces, and error code constants. Tests: parse/round-trip validation per request/response schema.
3. **Errors + types** — `apps/api/src/modules/deliveries/delivery-errors.ts` (AppError subclasses), `delivery.types.ts` (internal records), `delivery-creation.contracts.ts` (internal service interface).
4. **Source policy** — `delivery-source.policy.ts` with the three pure eligibility predicates. Tests: exhaustive table-driven coverage of every state value per source.
5. **Write repository** — `postgres-delivery-write.repository.ts` exposing `withTransaction` + `createPostgresDeliveryWriteTransaction(tx)` with `findExistingBySource`, `insertDelivery`, `insertDeliveryItems`. Tests: happy path, unique-violation behavior, check-constraint rejections.
6. **Source adapters** — `pos-sale-delivery-source.adapter.ts`, `online-order-delivery-source-stub.adapter.ts`, `transfer-delivery-source.adapter.ts`. Tests: unit test the POS and transfer adapters against fake repos; the stub returns null.
7. **Service compose** — `delivery-creation.compose.ts` (the heart: tx, idempotency, eligibility, mint, per-source stock branch, retry on 23505) + `delivery-creation.service.ts` (three thin methods) + `delivery-item-reference.ts` (reference minting). Tests: unit-test each method's input validation and error mapping; integration tests for end-to-end happy paths and the rollback invariant.
8. **Runtime + integration tests** — `create-deliveries-runtime.ts` composing the service with stock + sales + reference-number + platform-event-publisher + system-user-id; concurrent-insert integration test; production-startup warning when stub adapter is wired.

Open user decisions before build:
- **Permission keys**: confirm three keys (`deliveries.create_from_sale`, `deliveries.create_from_online_order`, `deliveries.create_from_transfer`) for the seed catalogue.
- **`API_SYSTEM_USER_ID` env**: confirm we add a system user to the seed bootstrap and load its uuid via env. Alternative is a hardcoded uuid constant in the seed.
- **Cross-module stock import**: the deliveries module imports `createPostgresStockReservationTransaction` directly from stock. Acceptable today (other modules do similar), or do we want a thin `StockReservationTxParticipant` boundary contract in `packages/contracts` first?

