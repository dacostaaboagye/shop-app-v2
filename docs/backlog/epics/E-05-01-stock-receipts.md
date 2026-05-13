---
id: E-05-01
title: Record supplier stock receipts into location inventory
status: shipped
priority: P1
domain: full-stack
owner: codex
parents: [E-04]
acceptance:
  - Admin or authorized procurement users can record received supplier goods against a supplier procurement order and destination location.
  - Received quantities update `stock_balances` atomically for the received SKU/location.
  - Every non-zero receipt writes append-only `stock_movements` evidence with `movementType = "goods_receipt"` and a stable source key.
  - Re-recording or retrying the same receipt cannot double-add stock.
  - The supplier procurement order status reflects partial or full receipt after stock updates commit.
  - Public API and UI responses use supplier slugs, procurement references, location slugs, variant slugs, and SKUs, not raw internal ids.
  - Receipt failures leave supplier procurement, stock balances, and stock movements unchanged.
size: medium
---

## Why

E-05 moves from counting stock to controlling how stock enters and moves through the business. The first valuable slice is supplier stock receipt: when goods arrive from a supplier, the warehouse or admin team needs the received quantity to become available inventory at the destination location without losing procurement evidence.

The codebase already tracks supplier procurement orders and can record a supplier goods receipt transaction, but that receipt does not yet appear to update location stock through the audited stock movement path. This slice closes that inventory-accountability gap.

## Current implementation context

Existing foundations:

- `supplier_procurement_orders` and `supplier_procurement_order_lines` exist.
- Admin supplier screens can create procurement orders, transition them, and record received line quantities.
- `supplier_transactions` already supports `goods_receipt`.
- `stock_balances` and `stock_movements` exist and are used by opening stock, stock counts, stock takes, sales, returns, deliveries, and supply requests.
- `stockMovementTypeEnum` already includes `goods_receipt`.
- `PostgresStockMovementSyncRepository` and stock receipt operations provide patterns for transactional balance updates and append-only movement evidence.

Original gap:

- `receiveSupplierProcurementOrder` updates procurement line receipt state and writes a supplier transaction, but it does not currently insert stock movements or increment destination stock balances for the received quantities.

## Shipped evidence

- PR: https://github.com/dacostaaboagye/shop-app-v2/pull/159
- Merge commit: `c8067e3a584ef579f8a6069a68a58a54bef04767`
- Implementation:
  - `receiveSupplierProcurementOrder` now runs the receipt workflow in a serializable transaction.
  - Receipt deltas are computed from the previous line received total and written to `stock_balances` plus append-only `stock_movements`.
  - `stock_movement_type` now includes `goods_receipt` through migration `0049_funny_pride.sql`.
  - Duplicate variant rows, quantity reductions, over-receipts, and missing destination locations are rejected with structured errors.
- Verification:
  - `pnpm --dir apps/api exec tsx --test test/supplier-procurement-receipt-rules.test.ts test/stock-movement-sync.service.test.ts`
  - `pnpm --dir packages/database test`
  - `pnpm --dir apps/api test`
  - `pnpm guard`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - GitHub CI `validate` passed on PR #159.

## Out of scope

- Supplier portal self-service receipt.
- Purchase-order approval redesign.
- Supplier invoices, payments, returns, and credit notes.
- Multi-location receipt splitting in one receipt event.
- Creating catalog products from receipt rows.
- Barcode scanning.
- Transfer between locations; that remains a later E-05 slice.

## Design direction

Receipt recording should remain supplier-owned at the workflow boundary and stock-owned at the inventory mutation boundary.

Implementation shape:

- Keep the public route under the existing admin supplier procurement surface.
- Extend the supplier procurement receive workflow to call a stock-owned service or repository port inside the same database transaction.
- Use `movementType = "goods_receipt"`.
- Use a deterministic `sourceType` / `sourceKey`, for example `supplier_procurement_receipt` and `{procurementReference}:{variantSlug}` or a stronger receipt reference if introduced.
- Compute the delta from newly received quantity, not total received quantity, so partial receipt updates cannot replay previously counted stock.
- Reject received totals that exceed approved or ordered quantities unless a later product decision allows over-receipt.
- Write supplier transaction evidence only after the stock mutation path succeeds in the same transaction.

## Tasks

1. Add a receipt-delta helper for supplier procurement lines.
2. Extend the supplier procurement receive repository/service so receipt deltas update stock balances and append stock movements transactionally.
3. Make retries idempotent by deriving movement source keys from procurement reference, line identity, and receipt sequence or by only applying positive deltas once.
4. Add structured errors for missing destination location, invalid variant link, over-receipt, and stale order status.
5. Update contracts only if public response fields need to expose receipt movement references.
6. Update admin supplier UI copy/state only if the current receive interaction cannot explain partial and full receipt results.
7. Add service/repository tests proving procurement state, stock balance, stock movement, and supplier transaction commit or roll back together.

## Test plan

- Given an ordered procurement order with a destination location, when an admin records received quantities, then stock balances increase by the received deltas and `goods_receipt` movements are appended.
- Given a partially received order, when the second receipt is recorded, then only the new delta is added to stock.
- Given the same receive request is retried after success, then stock is not double-added.
- Given a receipt line exceeds the ordered or approved quantity, then the request is rejected and no stock, procurement, or transaction rows change.
- Given the procurement order has no destination location, then receipt into inventory is rejected with an actionable problem detail.
- Given a user lacks the supplier procurement or inventory permission, then the API denies the write.
- Given the stock mutation fails, then procurement received quantities and supplier transactions are rolled back.

## UAT scenarios

1. Admin creates a supplier order for two SKUs to Accra Central Store, marks it ordered, receives both lines, and sees the SKU balances increase at Accra Central Store.
2. Admin receives 5 of 10 units, later receives the remaining 5, and sees two receipt events without the first 5 being counted twice.
3. Admin attempts to receive 12 of 10 units and gets a clear rejection before any stock changes.
4. Admin opens supplier activity and stock movement history and can trace the receipt by procurement reference.
