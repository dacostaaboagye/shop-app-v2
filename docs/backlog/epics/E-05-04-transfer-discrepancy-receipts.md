---
id: E-05-04
title: Record transfer receipt discrepancies
status: refined
priority: P1
domain: full-stack
owner: codex
parents: [E-05-03]
acceptance:
  - A receiver can confirm the full dispatched quantity with the existing fast path.
  - A receiver can record an accepted received quantity lower than the dispatched quantity with a mandatory discrepancy reason.
  - Destination on-hand stock increases only by the accepted received quantity.
  - Short or damaged quantities remain auditable through the transfer response, GTN response, transfer event payload, and transfer detail UI.
  - Received quantity cannot exceed dispatched quantity and returns a structured validation error when invalid.
  - Admin override receipt can record the same discrepancy evidence while still requiring an override reason.
  - Public API responses do not expose raw internal movement, transfer, GTN, or balance IDs beyond already-approved public UUID fields.
size: medium
---

## Why

E-05-03 completed write-offs for stock that leaves inventory outside normal flows. The next transfer gap is receipt truth: today the receiver can only confirm the full approved quantity, even when fewer usable units arrive.

That inflates destination stock and hides operational loss. A transfer receipt must be able to say "10 dispatched, 8 accepted, 2 damaged/missing" without forcing the receiver to overstate stock and clean it up later.

## Out of scope

- Reopening a completed transfer.
- Re-dispatching missing quantities.
- Insurance, supplier claims, or financial loss accounting.
- Photo/document evidence upload.
- Multi-line transfer aggregate redesign beyond the existing one-SKU request flow.

## Design direction

- Extend the existing confirm-receipt contract rather than adding a new endpoint.
- Keep `status = received` for both exact and discrepancy receipts in this slice. The transfer is closed operationally; discrepancy fields carry the exception evidence.
- Add receipt evidence fields to supply requests and GTNs:
  - `receivedQuantity`
  - `receiptDiscrepancyReason`
  - `receiptDiscrepancyNotes`
- Accepted quantity defaults to the dispatched/approved quantity for backwards compatibility.
- If `receivedQuantity < approvedQuantity`, require `receiptDiscrepancyReason`.
- If `receivedQuantity > approvedQuantity`, reject with structured problem details.
- Destination stock receives only `receivedQuantity`.
- If `receivedQuantity = 0`, skip the `transfer_in` stock movement because zero-quantity movements are forbidden by schema.
- Transfer and platform event payloads include expected, received, and missing quantities.

## Tasks

1. Extend contracts for discrepancy receipt request/response fields.
2. Add database columns and migration for supply requests and GTNs.
3. Update receipt confirmation service logic and route propagation.
4. Update transfer response mappers and event payloads.
5. Update worker and admin override receipt dialogs.
6. Surface discrepancy evidence in transfer detail UI and lane classification.
7. Add focused contract, API, database, and UI helper tests.

## Test plan

- Given no received quantity is supplied, receipt behaves as full quantity received.
- Given received quantity is less than approved quantity and a reason is supplied, destination stock increases by only the received quantity.
- Given received quantity is less than approved quantity and no reason is supplied, API returns a structured validation error.
- Given received quantity exceeds approved quantity, API returns a structured validation error.
- Given an admin override records a discrepancy, override reason and discrepancy reason are both required.
- Given a discrepancy receipt is listed, the UI shows expected, received, and missing quantities.

## UAT scenarios

1. Worker receives all dispatched units and confirms with one click plus optional notes.
2. Worker receives fewer usable units, selects a discrepancy reason, enters accepted quantity, and confirms.
3. Admin uses override receipt for an unavailable worker and records a short receipt with an override reason.
4. Admin opens the transfer workspace and sees the discrepancy in the exception lane and detail panel.
