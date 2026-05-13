---
id: E-05-03
title: Record stock write-offs with auditable reasons
status: refined
priority: P1
domain: full-stack
owner: codex
parents: [E-05-02]
acceptance:
  - Admin users can write off stock for any active SKU/location balance by entering a positive quantity, mandatory reason, and mandatory evidence note.
  - Manager users can write off stock only for locations where they hold location-scoped `inventory.write`; out-of-scope locations are rejected server-side.
  - Write-offs reduce on-hand stock atomically and append a `manual_adjustment` stock movement with a negative quantity delta.
  - Write-offs cannot reduce on-hand quantity below reserved quantity and return a structured problem detail when blocked.
  - Supported write-off reasons include damaged, expired, stolen, shrinkage, and correction.
  - The stock balance and stock movement history pages reflect successful write-offs after submission.
  - Public API and UI responses use SKU, location slug, product/variant slugs, and public labels, not raw internal IDs.
size: medium
---

## Why

E-05-02 made the stock movement ledger visible. Operators now need a dedicated way to explain stock that leaves inventory outside normal sale, transfer, receipt, return, or stock-take flows.

Today an admin or manager can use a stock count to force the final on-hand number, but that is not the same user journey as recording "3 units expired" or "1 unit stolen." A write-off workflow captures the operational cause directly, protects reserved stock, and leaves a clear negative movement in history.

## Out of scope

- Editing, voiding, or deleting prior write-offs.
- Uploading evidence photos or documents.
- Multi-SKU bulk write-offs.
- Financial loss accounting, insurance claims, or supplier credit workflows.
- Worker-initiated write-offs.

## Design direction

- Add a dedicated write-off contract rather than overloading the stock-count request.
- Reuse the stock module's row-locked balance mutation pattern.
- API routes:
  - `POST /api/admin/stock/balances/write-off`
    - Permission: `inventory.write`.
  - `POST /api/manager/stock/balances/write-off`
    - Permission: `inventory.write`, `scope: "any_active"`.
    - Handler resolves the submitted location slug and rechecks `inventory.write` for that location before writing.
- Request:
  - `locationSlug`
  - `sku`
  - `quantity`
  - `reasonCode`: `damaged | expired | stolen | shrinkage | correction`
  - `note`
- Persistence:
  - Lock the `(sku, location)` balance row.
  - Reject missing balance, missing SKU/location, non-positive quantity, and write-offs that would reduce on-hand below reserved quantity.
  - Update `stock_balances.on_hand_quantity -= quantity`.
  - Insert `stock_movements` with `movementType = "manual_adjustment"`, `sourceType = "stock_write_off"`, unique source key, negative `quantityDelta`, reason, note, actor, and timestamp.
- UI:
  - Add a "Write off" action next to count actions on admin and manager stock rows when the actor can write.
  - Use a focused dialog with current on-hand, reserved, and available context.
  - Require reason and note in the form. The quantity field is capped by available quantity in the client but still enforced by the backend.

## Security and data integrity notes

- Frontend button visibility is only UX. The manager route must enforce scoped `inventory.write` server-side.
- The route must not expose raw balance, location, SKU, movement, or user IDs in public responses.
- The write-off is append-only evidence; corrections must be new compensating movements.
- The backend must treat reserved quantity as protected stock and reject write-offs that would make available stock negative.

## Tasks

1. Add write-off reason contract and request/response schemas.
2. Add database enum values for `expired` and `stolen`.
3. Add stock write-off repository/service path and admin/manager routes.
4. Add React Query mutations.
5. Add shared write-off dialog/form and wire it into admin and manager stock pages.
6. Add focused contract, database, API, and UI helper tests.
7. Verify with guard, targeted tests, typecheck/lint, and Playwright on admin/manager stock pages.

## Test plan

- Given an admin writes off 2 damaged units, stock on-hand decreases by 2 and a negative movement appears in movement history.
- Given a manager writes off stock at an in-scope location, the request succeeds.
- Given a manager submits an out-of-scope location, the API returns 403 and stock is unchanged.
- Given a write-off would reduce on-hand below reserved quantity, the API returns a structured conflict and stock is unchanged.
- Given quantity is zero, negative, or greater than available, validation blocks submission.
- Given reason or note is missing, validation blocks submission.
- Given the response is inspected, no raw internal IDs are exposed.

## UAT scenarios

1. Admin filters stock levels to one location, selects a SKU, records `damaged` quantity 1 with a note, and sees on-hand decrease.
2. Admin opens stock movement history for the same SKU/location and sees a `manual_adjustment` row with negative delta and the write-off reason.
3. Manager opens their location stock page, records an `expired` write-off, and sees the table refresh.
4. Manager attempts to write off more than available quantity and receives a clear blocked-state message.

## Related PRs

- [PR #169](https://github.com/dacostaaboagye/shop-app-v2/pull/169) - `feat(e-05-03): add stock write-offs`
