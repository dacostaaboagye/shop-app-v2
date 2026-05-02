# Deliveries Module

Owns:

- delivery records
- delivery items
- delivery creation from POS sales, online orders, and inter-location transfers
- (E-00C-02..05) status transitions, agent assignment, service surface, REST API

## E-00C-01 status

Delivery source ingest infrastructure is in place:

- Schema additions (`source_type` enum, `source_reference`, `destination_kind`, idempotency unique index, two check constraints) — see `packages/database/src/schema/deliveries.ts` and migration `0038_supreme_skreet.sql`.
- Public contracts in `packages/contracts/src/deliveries.ts` — request/response schemas, error codes, source-port interfaces.
- Service: `DeliveryCreationService` with `createFromPosSale` / `createFromOnlineOrder` / `createFromTransfer`.
- Compose helper `delivery-creation.compose.ts` owns the tx, runs idempotency read-before-insert, mints item references via `ReferenceNumberService` (sequence key `delivery-item`), inserts delivery + items, retries once on `pg 23505` against the `deliveries_source_unique` constraint.
- Source eligibility policy in `delivery-source.policy.ts` is the single authoritative interpreter of source-state strings.

## What's still stubbed (follow-up work)

Three source-port adapters ship as **stubs** that always return null. Real wiring lands in follow-up commits:

- `pos-sale-delivery-source-stub.adapter.ts` — wire to `apps/api/src/modules/sales/pos-sale.service.ts`.
- `online-order-delivery-source-stub.adapter.ts` — wire when E-14 (online checkout) ships.
- `transfer-delivery-source-stub.adapter.ts` — wire to the stock-transfers module.

Stock-module side effects inside `composeOnce` (reservation insert + onHand→reserved adjust for transfer; reservation insert for online order) are noted with a `TODO(e-00c-01)` and will land alongside the real adapters. The compose helper already owns the Drizzle tx, so the stock-tx factory will participate cleanly via `createPostgresStockReservationTransaction(tx)`.

## Future work

- E-00C-02: status lifecycle (draft → assigned → in_transit → completed/cancelled)
- E-00C-03: agent assignment service
- E-00C-04: query service (listByAgent, listByLocation)
- E-00C-05: REST routes with `config.access` permission gating per source type
- E-15: delivery agent portal subscribes to `delivery.created` platform events
