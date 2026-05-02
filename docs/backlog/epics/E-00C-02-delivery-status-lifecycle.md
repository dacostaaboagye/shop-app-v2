---
id: E-00C-02
title: Manage delivery status through its full lifecycle
status: planned
priority: P0
domain: backend
owner: claude
parents: []
acceptance:
  - A delivery is created in status "draft" (already enforced at the schema level by E-00C-01).
  - A delivery in "draft" can transition to "assigned" only when an assignedUserId is set; assignedAt is stamped on transition.
  - A delivery in "assigned" can transition to "in_transit"; dispatchedAt is stamped on transition.
  - A delivery in "in_transit" can transition to "completed"; completedAt is stamped on transition.
  - A delivery in any non-terminal state ("draft", "assigned", "in_transit") can transition to "cancelled" with a mandatory reason; cancelledAt is stamped on transition.
  - Terminal states ("completed", "cancelled") cannot transition further. Any attempt rejects with a domain error.
  - All transitions are atomic — the status update, the corresponding timestamp, and the actor are written in a single SQL statement; no half-updated rows.
  - Concurrent transition attempts on the same delivery resolve via optimistic locking — the second writer sees the row in its new state and rejects, never silently overwriting.
  - Every transition publishes a `delivery.status_changed` platform event with the from/to status, actor, occurredAt, and delivery publicId. "noop" transitions (already in target state) do not emit a duplicate event.
  - Public-facing APIs surface a typed error code per illegal transition; no raw 500s.
  - Cross-domain reads (assignment lookup) go through service interfaces; no direct table access from outside the deliveries module.
size: small
---

## Why

E-00C-01 shipped the deliveries table with a `delivery_status` enum (`draft | assigned | in_transit | completed | cancelled`) and per-state timestamp columns (`assigned_at`, `dispatched_at`, `completed_at`, `cancelled_at`), but no service that owns transitions. Every downstream consumer — the agent assignment service (E-00C-03), the agent portal (E-15), notification recipients, the customer-facing tracking flow (E-16) — needs a single seam that says "this is the only way a delivery's status changes."

This epic adds that seam: a `DeliveryStatusService` with one transition method per legal edge, plus a state machine that rejects illegal transitions and surfaces structured errors. Once it exists, no other module is allowed to mutate `deliveries.status` directly.

## Out of scope

- Delivery agent assignment logic itself — owned by E-00C-03. This epic only validates that an `assignedUserId` is present before a `draft → assigned` transition; it does not assign agents.
- Stock movements that fire on dispatch or receipt (`transfer_out` / `transfer_in` rows) — punt to a follow-up epic. The transition itself doesn't touch stock here.
- Customer-facing delivery tracking, notifications to the customer — owned by E-15 / E-16.
- Read APIs (listByAgent, listByLocation) — owned by E-00C-04.
- REST routes and `config.access` wiring — owned by E-00C-05.
- Bulk transitions or admin overrides that skip the state machine — out of scope for this epic.
- Backfilling status for historical deliveries — not relevant; no historical rows exist.

## Edge cases

- **Illegal transition (e.g. completed → assigned, in_transit → draft)** — reject with `DeliveryIllegalStatusTransitionError` carrying both states. No write.
- **Idempotent transition (already in target state)** — return the current row with a `noop` indicator. Do not re-stamp timestamps. Do not emit a duplicate event.
- **Concurrent transition attempts** — optimistic locking via `WHERE status = <expected>` clause. Second writer sees zero rows updated and rejects with `DeliveryStatusConflictError`.
- **Transition to "assigned" without an assignedUserId** — reject with `DeliveryAssignmentRequiredError`. Don't allow a "phantom assigned" state.
- **Transition to "cancelled" without a reason** — reject with validation error. Reason captured in the audit trail / event payload.
- **Delivery row missing** — reject with `DeliverySourceNotFoundError` (re-using the existing error class from E-00C-01).
- **Event publish fails after commit** — the status change still landed (the tx already committed); the platform-event outbox loop will retry.

## Open questions for design

The architect needs to resolve in Stage 2:

1. **Where does the actor identity come from?** The transition methods need to record who triggered the change (for audit, for the event payload). Inject as a parameter? Take from a request-context wrapper? E-00C-01's `createdBy` came from input; pattern should match.
2. **State machine representation** — table-driven (a const `Record<DeliveryStatus, DeliveryStatus[]>`) vs explicit `if`/`switch`. Trade-off: extensibility vs readability. Match what E-00C-01's eligibility policy did (pure functions).
3. **Timestamp atomicity** — single `UPDATE deliveries SET status = ?, dispatched_at = ?, updated_at = ?, updated_by = ? WHERE id = ? AND status = <expected>` is one statement; should be enough. Confirm there's no scenario that needs additional rows in the same tx (e.g., a status-change ledger).
4. **Should we add a `status_change_events` append-only ledger table now**, per ADR 0003, or defer to a separate epic? The current schema doesn't capture the *history* of status changes, only the latest state and per-state stamps. ADR 0003 says append-only ledgers are how we record state-change history. Lean: **defer to a separate epic** — this epic ships transitions; the ledger is its own concern. Confirm with the architect.
5. **Cancellation reason storage** — there's no `cancellation_reason` column on deliveries today. Add it (varchar 240, nullable, only set on cancellation), or store in the event payload only and not on the row? Lean: add the column for ergonomic admin-UI reads later.
6. **Permission key for transitions** — one key per transition (`deliveries.assign`, `deliveries.dispatch`, `deliveries.complete`, `deliveries.cancel`) or one umbrella `deliveries.transition`? Per E-00C-01's per-source pattern, one key per transition is the project lean.

## Design

Author: `node-backend-systems-architect`. Aligns with ADRs 0001 (modular monolith), 0003 (append-only ledgers), 0004 (route enforcement), 0011 (transfer workflow).

### Decisions

- **Schema additions**: add `cancellation_reason varchar(240)` + actor columns `assigned_by` / `dispatched_by` / `completed_by` / `cancelled_by` (uuid → users). Check constraint: `(status = 'cancelled') = (cancellation_reason IS NOT NULL)`. Single migration.
- **No status-change ledger table**. Platform-event log (`platform_events`) is the audit trail per ADR 0003. A denormalized read model can be materialised later if a UI demands it.
- **State machine**: pure-function policy file `delivery-status-transition.policy.ts` with a const adjacency table. Mirrors `delivery-source.policy.ts`. Returns `TransitionVerdict` distinguishing `illegal_transition` from `terminal_state`.
- **Service interface**: four methods (`assign`, `dispatch`, `complete`, `cancel`) — not a discriminated-union `transition(input)`. Inputs differ per transition (assign needs `assignedUserId`; cancel needs `reason`).
- **Atomic transition**: single guarded `UPDATE … WHERE id = $deliveryId AND status = $expectedStatus` with optimistic locking. Zero rows updated → re-read row, surface as `DeliverySourceNotFoundError` (gone) or `DeliveryStatusConflictError` (raced).
- **Actor identity**: input parameter `actorUserId: string`. Matches `createdBy` from E-00C-01.
- **Permission keys**: per-transition — `deliveries.assign`, `deliveries.dispatch`, `deliveries.complete`, `deliveries.cancel`.
- **Event publishing**: `delivery.status_changed` via `PlatformEventPublisher.publish` after commit. Mirrors `password-reset.service.ts`. Carries `from`, `to`, `actorUserId`, `assignedUserId` (if applicable), `cancellationReason` (if applicable).
- **Re-assignment**: out of scope. Only `draft → assigned` is allowed. Re-assignment becomes a separate epic with its own method.
- **Cancellation reason**: free-text varchar(240). No enum / vocabulary in this epic; product can revisit later.

### Module layout

| File | New/Extend | Responsibility |
|---|---|---|
| `delivery-status.contracts.ts` | new | `DeliveryStatusService` interface + input types |
| `delivery-status.service.ts` | new | Thin wrapper over compose |
| `delivery-status.compose.ts` | new | Per-transition: load → policy gate → CAS write → event publish |
| `delivery-status-transition.policy.ts` | new | `canTransition`, `getAllowedNextStates`, `isTerminalStatus` |
| `delivery-status-events.ts` | new | `createDeliveryStatusChangedEvent(...)` factory |
| `postgres-delivery-status-write.repository.ts` | new | Repository with `withTransaction` + tx factory; CAS update |
| `delivery-status.errors.ts` | new | `DeliveryIllegalStatusTransitionError`, `DeliveryTerminalStatusError`, `DeliveryStatusConflictError`, `DeliveryAssignmentRequiredError` |
| `delivery-row-mapper.ts` | new (extracted) | Shared mapper for both creation + status repos |
| `delivery.types.ts` | extend | Add lifecycle fields (assignedUserId, *At, *By, cancellationReason) |
| `postgres-delivery-write.repository.ts` | extend | Use shared mapper from `delivery-row-mapper.ts` |
| `create-deliveries-runtime.ts` | extend | Wire status repo + compose + service + platform event publisher |
| `packages/contracts/src/deliveries.ts` | extend | Per-transition request schemas, response schema additions, new error codes, event-type constant |

## Tasks

Eight commit-sized tasks, sequential.

1. **Schema migration** — add 5 columns + check constraint to `deliveries`. Generate Drizzle migration. Update `deliveries.test.ts` schema assertions.
2. **Contracts extension** — extend `packages/contracts/src/deliveries.ts` with the four request schemas, lifecycle response fields, new error codes, `DELIVERY_STATUS_CHANGED_EVENT_TYPE` constant. Add tests.
3. **Status errors + types** — `delivery-status.errors.ts`, extend `delivery.types.ts` with lifecycle fields, extract `delivery-row-mapper.ts` and update `postgres-delivery-write.repository.ts` to use it.
4. **Transition policy** — `delivery-status-transition.policy.ts` + table-driven tests covering every (from, to) pair.
5. **Status event factory** — `delivery-status-events.ts` per `auth/security-events.ts` pattern. Unit tests for payload shape.
6. **Status write repository** — `postgres-delivery-status-write.repository.ts` with `withTransaction`, `findById`, and `transitionStatus` (CAS UPDATE). Tests if feasible without real DB.
7. **Compose + service** — `delivery-status.compose.ts` (the heart: load → policy gate → CAS → event publish), `delivery-status.service.ts` (thin wrapper). Service unit tests covering not-found / illegal / terminal / conflict / noop paths with port fakes.
8. **Runtime + service interface** — extend `create-deliveries-runtime.ts` to compose the status service. Wire `PlatformEventPublisher` (optional — log warning if absent in production).

Real-DB integration tests for happy-path transitions, idempotent re-call, concurrent CAS race, and after-commit event publish ordering land alongside E-00C-01's integration test follow-up.

