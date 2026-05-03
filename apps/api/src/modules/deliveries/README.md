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

The online-order source-port adapter remains a deliberate stub until E-14 ships the online order module:

- `online-order-delivery-source-stub.adapter.ts` - wire when E-14 (online checkout) ships.

POS sale and transfer sources now use real adapters:

- `../sales/pos-sale-delivery-source.adapter.ts` maps confirmed POS invoices and line items into delivery sources and is injected through `createSalesRuntime`.
- `../stock/transfer-delivery-source.adapter.ts` maps approved stock transfers into delivery sources and is injected through `createStockRuntime`.

Stock-module side effects run inside the same Drizzle transaction as delivery creation:

- POS sale deliveries do not touch stock because POS confirmation already decremented stock.
- Online order deliveries reserve stock at the origin once E-14 provides a real source.
- Transfer deliveries call the stock-owned delivery stock side-effect participant, which reserves and confirms origin stock, records a `transfer_out` stock movement, and creates dispatched GTN evidence so stock reads surface the quantity as in-transit.

## Future work

- E-00C-02: status lifecycle (draft → assigned → in_transit → completed/cancelled)
- E-00C-03: agent assignment service
- E-00C-04: query service (listByAgent, listByLocation)
- E-00C-05: REST routes with `config.access` permission gating per source type
- E-15: delivery agent portal subscribes to `delivery.created` platform events
