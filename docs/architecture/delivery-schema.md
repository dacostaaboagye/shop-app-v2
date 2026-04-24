# Delivery Schema

`E-00C-01` establishes the delivery persistence foundation.

## `deliveries`

Operational delivery header row.

- `origin_location_id`: required physical source location
- `destination_location_id`: optional in-network destination location
- `destination_snapshot`: optional external destination payload for customer or
  other non-location deliveries
- `status`: `draft`, `assigned`, `in_transit`, `completed`, `cancelled`
- `assigned_user_id`: nullable assignee for later delivery assignment workflows
- lifecycle timestamps: `assigned_at`, `dispatched_at`, `completed_at`,
  `cancelled_at`

This table is mutable operational state. Later delivery transition tickets
update status and lifecycle timestamps.

## `delivery_items`

Quantity-bearing items attached to one delivery.

- `sku_id`: stock-bearing identity for delivery quantity
- `quantity`: positive item quantity
- `item_reference`: optional later public reference field aligned with the
  `DEL-*` reference-number format

This foundation keeps delivery quantity keyed by SKU so delivery work composes
with ownership, stock balances, reservations, and stock movement sync.
