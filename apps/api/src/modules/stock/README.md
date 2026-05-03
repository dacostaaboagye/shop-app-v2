# Stock Module

Owns:

- stock balance
- stock movement journal
- stock reservations
- availability calculation
- reservation confirmation and release
- delivery stock side-effect participants for delivery creation transaction
  boundaries
- expiry jobs and balance synchronization

This module is concurrency-sensitive. Stock mutations must be transactional.

Current foundation assumptions:

- balances and reservations are keyed by stock-bearing SKU, not parent product
- `stock_balances` is the lock target for future reservation and stock mutation
  transactions
- `stock_movements` is the append-only sync journal for on-hand quantity changes
- `stock_reservations` carries operational lifecycle state and can be updated by
  later `E-00B-*` services
- available quantity is derived from `on_hand_quantity - reserved_quantity`
  for normal reads, with active-reservation aggregation used when a workflow
  needs to exclude a specific reservation from the calculation

Current foundation status:

- `E-00B-01`: stock balance and reservation tables exist
- `E-00B-02`: availability query uses `stock_balances.reserved_quantity` for
  standard reads and supports reservation-aware exclusion flows when a specific
  active reservation must be omitted
- `E-00B-03`: reservation lifecycle service creates, confirms, and releases
  reservations with transactional balance updates and row-level locking
- `E-00B-04`: stock balance initialization and on-hand adjustment service
  guards the lock row and blocks changes that would violate reserved stock
- `E-00B-05`: reservation expiry job expires due active reservations and
  restores reserved stock through the same balance row
- `E-00B-06`: stock movement sync applies idempotent external movement events to
  the balance row and records append-only movement evidence
- `E-00B-07`: active reservations admin API lists live reservations with
  inventory-read permission and no raw reservation row ids

Usage examples:

- POS read path: `getAvailableStock({ skuId, locationId })`
- reservation update path:
  `getAvailableStock({ skuId, locationId, excludeReservationId, lock: "for_update" })`
- portal or e-commerce read path: `getAvailableStock({ skuId, locationId })`
- reservation create path:
  `createReservation({ skuId, locationId, quantity, sourceType, sourceKey, ttlMinutes })`
- reservation confirm path: `confirmReservation({ reservationId })`
- reservation release path:
  `releaseReservation({ reservationId, reason: "customer_cancelled" })`
- balance initialization path:
  `initializeBalance({ skuId, locationId, openingQuantity })`
- balance adjustment path:
  `adjustOnHandQuantity({ skuId, locationId, quantityDelta })`
- reservation expiry job path:
  `expireReservations({ expiredBefore, limit })`
- stock movement sync path:
  `syncMovement({ skuId, locationId, movementType, sourceType, sourceKey, quantityDelta, occurredAt })`
- active reservation admin path:
  `GET /api/admin/stock/reservations/active?locationId=...`
- delivery creation transaction participant:
  `applyDeliveryStockSideEffectsInStockTransaction(...)` reserves origin stock
  for delivery sources and confirms transfer reservations with a matching
  `transfer_out` stock movement plus dispatched GTN evidence for in-transit
  stock reads

Workbook-to-repo interpretation for `E-00B-03`:

- workbook `productId` maps to repo `skuId`
- workbook `channel` and `sourceId` map to repo `sourceType` and `sourceKey`
- balance mutations target `stock_balances.on_hand_quantity` and
  `stock_balances.reserved_quantity`
