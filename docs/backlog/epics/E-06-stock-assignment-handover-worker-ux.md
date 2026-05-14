---
id: E-06
title: Stock assignment and handover worker UX layer
status: refined
priority: P1
domain: full-stack
owner: codex
parents: [E-00A, E-01, E-02, E-03, E-04]
acceptance:
  - Workers can see the stock variants currently assigned to them at an active location with product, SKU, image, quantity, and stock status context.
  - Workers can start a full-assignment handover from their assignment list without leaving the worker portal.
  - Workers can see active received, active given, reverted, and historical handover chains from a dedicated worker handover workspace.
  - Workers can revert an active handover they are accountable for, and the action appends ledger evidence rather than mutating history.
  - Managers can inspect active handovers for their managed locations and intervene when a handover is stuck or incorrect.
  - All handover and assignment actions remain server-authorized by location scope; frontend visibility is never the access-control boundary.
  - Public responses avoid exposing new raw internal surrogate IDs; existing UUID handover-chain identifiers remain accepted for the current contract.
size: medium
---

## Why

E-00A shipped the inventory ownership foundation: append-only stock ownership events, assignment and reassignment writers, handover writers, auto-revert support, ownership history, and sales attribution.

E-06 is the operations layer over that foundation. Workers and managers need a usable way to see who is accountable for stock right now, hand stock custody to another worker, and review handover evidence when stock goes missing or a shift changes hands.

The current repo already has partial surfaces:

- Manager stock assignment list and new-assignment flow exist under `/manager/assignments`.
- Worker assignment list exists under `/worker/assignments`.
- Worker handovers route exists, but it is still a placeholder planned workspace.
- Backend assignment and handover command endpoints exist for manager and worker portals.

The gap is not the ledger. The gap is the day-to-day custody workflow and the query surfaces that make handovers visible.

## Out of scope

- Replacing the append-only ownership ledger shipped by E-00A.
- Partial-quantity handovers. The existing handover service transfers the full current assignment quantity; supporting partial handover would require split ownership semantics and a separate design.
- Sales, returns, and receipt stock movements except where they read current assignment context.
- Changing staff provisioning or worker account creation.
- Building an investigation or audit case-management module; E-08 owns formal accountability investigations.
- Offline-first handover capture.

## Current System Read

### Backend

- `packages/database/src/schema/inventory-ownership.ts` stores append-only `stock_ownership_events`.
- `apps/api/src/modules/inventory-ownership/ownership-event-write.service.ts` owns assign and reassign writes.
- `apps/api/src/modules/inventory-ownership/ownership-handover.service.ts` owns handover initiation, chaining, ending, and auto-revert.
- `apps/api/src/modules/assignments/stock-assignment-manager.routes.ts` exposes manager assignment, reassignment, handover, revert, and location assignment list routes.
- `apps/api/src/modules/assignments/stock-assignment-worker.routes.ts` exposes worker assignment list, handover initiation, and handover revert routes.
- `apps/api/src/modules/assignments/assignment-command.service.ts` publishes `assignment.*` platform events after created assignment and handover writes.

### Frontend

- `/manager/assignments` shows current location assignments.
- `/manager/assignments/new` supports assigning multiple variants to one worker.
- `/worker/assignments` shows current worker assignments and supports supply-request actions.
- `/worker/handovers` is a placeholder and has no operational workflow yet.

## User Journeys

### Worker Reviews Assigned Stock

1. Worker opens `/worker/assignments`.
2. Worker selects their active location if they have more than one.
3. Worker sees assigned variants with SKU, quantity, stock availability, image, low-stock state, and supply-request actions.
4. Worker can start a handover for a specific assignment from the same item surface.

### Worker Starts A Handover

1. Worker selects an assigned variant.
2. Worker chooses an eligible receiving worker at the same location.
3. Worker confirms the handover.
4. Backend verifies the actor is the current owner and has `stock.handovers.manage` for that location.
5. Backend appends paired `handover_out` and `handover_in` events in one transaction.
6. UI routes the worker to `/worker/handovers` with the new active handover visible.

### Worker Reviews Handover Activity

1. Worker opens `/worker/handovers`.
2. Worker sees lanes for active received, active given, reverted, and historical handover chains.
3. Active received and active given handovers show product, SKU, from-worker, to-worker, location, created time, and chain status.
4. Worker can revert a handover where they are the accountable actor for the active chain state.

### Manager Intervenes In Handover Exceptions

1. Manager opens `/manager/assignments` for a managed location.
2. Manager sees active handovers alongside normal assignments or through a handover lane/filter.
3. Manager can revert a stuck or incorrect handover when they hold `stock.assignments.manage` for that location.
4. The revert appends a new `reverted` event and is visible in worker and manager history.

## Design Direction

- Keep ownership correctness in the existing append-only ledger. Do not add mutable current-owner rows.
- Add query surfaces for handover activity rather than trying to infer handovers only from the assignment list.
- Treat first-slice handovers as full-assignment transfers. The request contract currently includes `quantity`, but the service uses the current assignment quantity. The UI should not offer partial handover until backend split-quantity semantics are deliberately designed.
- Reuse existing assignment permissions:
  - worker list: `stock.assignments.own.view`
  - worker handover actions: `stock.handovers.manage`
  - manager assignment/handover management: `stock.assignments.manage`
  - manager assignment visibility: `stock.assignments.view`
- Prefer location-scoped checks at the API boundary plus payload-specific server validation, matching current assignment route patterns.
- New handover list DTOs should include display-ready names, slugs where available, and the existing `handoverChainId` UUID. Do not introduce raw database surrogate IDs beyond the already-exposed UUID contract.

## Proposed Slices

### E-06-01 Worker Handover Workspace

First implementation slice.

- Add backend query support for worker handovers by location and actor.
- Add `GET /api/worker/handovers` with location scope validation.
- Add contract types for handover summary rows and lane counts.
- Add `/worker/handovers` real UI with active received, active given, reverted, and history lanes.
- Add handover initiation action from `/worker/assignments`.
- Add focused route, service/query, contract, and UI helper tests.

### E-06-02 Manager Handover Oversight

- Add manager handover list query for managed locations.
- Surface active handovers from `/manager/assignments` or a dedicated manager handover tab.
- Add manager revert/intervention action with reason capture if the current backend contract needs audit reason support.
- Add tests for manager location scoping and stuck-handover intervention.

### E-06-03 Assignment History Polish

- Add assignment detail/history drill-in for manager and worker views.
- Show chronological assignment, reassignment, handover, revert, and sale attribution evidence.
- Cross-link to stock movement history where movement records exist.

## Edge Cases

- Handover is started while the assignment is already in an active handover: backend must return the existing active-handover conflict.
- Current owner changed after the page loaded: submit must fail with a state conflict and the UI must refetch.
- Receiving worker is not active or not assigned to the same location: backend rejects; frontend should filter them out.
- Worker tries to hand over stock at a location outside their active scope: route-level and location-specific checks reject.
- Manager tries to revert a handover outside their managed location: backend rejects.
- Handover is auto-reverted while the worker is viewing it: the next refetch shows reverted state; duplicate revert should be safe or return a clear conflict/no-op response.
- Product or variant was archived after assignment: history still displays the snapshot or safe fallback; assignment evidence remains visible.
- Platform event publish fails after ledger commit: ledger remains source of truth; notification delivery is best-effort through the existing event pipeline.

## Test Plan

- Contract tests accept handover list rows with display names, location context, product/SKU context, and `handoverChainId`.
- Worker handover list returns only chains where the actor is the source, receiver, or current accountable worker.
- Worker handover action rejects when the actor is not the current owner.
- Worker handover action rejects cross-location attempts.
- Manager handover oversight rejects locations outside `stock.assignments.manage`.
- Revert appends a `reverted` event and does not update prior ownership rows.
- UI helper tests classify active received, active given, reverted, and history lanes correctly.
- Playwright checks `/worker/handovers` at mobile and desktop widths after the first UI slice lands.

## UAT Scenarios

1. Worker with assigned stock starts a handover to another active worker at the same location and sees it in outgoing handovers.
2. Receiving worker opens handovers and sees the active received custody transfer with product, SKU, and source worker context.
3. Original worker or manager reverts a stuck handover and sees the reverted state in history.
4. Manager reviews a managed location and confirms active handovers do not disappear from accountability views.
5. Worker with no handovers sees a clear empty state and can navigate back to assignments.

## Open Questions

- Should handover revert require a human-readable reason in addition to the append-only event? Current backend accepts only `handoverChainId`.
- Should E-06 keep using `locationId`, `skuId`, and `workerId` in existing assignment request bodies, or should a hardening follow-up introduce slug-based assignment commands?
- Should the product add a separate "accept handover" step later? Current backend treats `handover_in` as immediate temporary custody and supports revert/end, not pending acceptance.
- Should active handovers appear inside `/worker/assignments`, `/worker/handovers`, or both? Default recommendation: action entry point in assignments, lifecycle tracking in handovers.

## Related PRs
