# Stock Schema

`E-00B-01` establishes the stock module persistence foundation.

## Inventory identity

Stock, reservations, and worker accountability attach to the stock-bearing SKU,
not the parent catalog product. A product may group multiple SKUs later, but
every quantity-bearing row in the inventory foundation uses `sku_id`.

## `stock_balances`

One lockable row per `(sku_id, location_id)` pair.

- `on_hand_quantity`: physical quantity currently held at the location
- `reserved_quantity`: portion of `on_hand_quantity` currently held by active
  reservations
- `available_quantity`: derived as `on_hand_quantity - reserved_quantity`, not
  stored
- unique `(sku_id, location_id)` index: supports `SELECT ... FOR UPDATE`
  locking in later reservation services

Guards:

- on-hand quantity cannot go negative
- reserved quantity cannot go negative
- reserved quantity cannot exceed on-hand quantity

## `stock_reservations`

Represents mutable reservation lifecycle state for a single SKU at a single
location.

- `status`: `active`, `confirmed`, `released`, `expired`, `cancelled`
- `source_type` and `source_key`: generic reservation owner reference so order,
  delivery, or manual flows can reuse the same table before those modules are
  fully modeled
- `expires_at`: optional deadline used by the expiry job
- partial unique index on active `(sku_id, location_id, source_type, source_key)`
  prevents duplicate live holds for the same source

This table is intentionally mutable. Unlike ownership events, reservations are
operational state, not immutable evidence.
