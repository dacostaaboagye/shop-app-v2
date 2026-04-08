# ADR 0010: SKU Is The Stock-Bearing Inventory Identity

## Status

Accepted

## Context

The backlog often says "product" when discussing ownership and stock, but stock
quantity, reservations, and barcode-level movement attach to the sellable SKU.
If the persistence layer keys inventory by product too early, later catalog
variant support would force invasive rewrites across ownership, stock, and
availability queries.

## Decision

- Inventory ledgers, balances, and reservations use `sku_id` as the quantity
  identity.
- `product` remains a higher-level catalog concept that may group one or more
  SKUs.
- The existing ownership foundation is aligned to `sku_id` before stock tables
  are introduced so accountability and availability share one key.

## Consequences

- Future catalog work must model a product-to-SKU relationship explicitly.
- Stock and ownership services can compose directly without translation layers.
- Workbook language that says "product" in quantity-sensitive tickets is
  interpreted in this repo as "stock-bearing SKU".
