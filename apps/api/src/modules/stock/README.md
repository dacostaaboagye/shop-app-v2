# Stock Module

Owns:

- stock balance
- stock reservations
- availability calculation
- reservation confirmation and release
- expiry jobs and balance synchronization

This module is concurrency-sensitive. Stock mutations must be transactional.

Current foundation assumptions:

- balances and reservations are keyed by stock-bearing SKU, not parent product
- `stock_balances` is the lock target for future reservation and stock mutation
  transactions
- `stock_reservations` carries operational lifecycle state and can be updated by
  later `E-00B-*` services
- available quantity is derived from `on_hand_quantity - reserved_quantity`
