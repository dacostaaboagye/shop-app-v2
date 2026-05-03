---
id: E-00C-03
title: Assign and reassign deliveries to agents
status: ready_for_review
priority: P0
domain: backend
owner: codex
parents: [E-00C-02]
acceptance:
  - Manager can assign a delivery to an agent (already shipped via E-00C-02 assign).
  - Manager can reassign an agent on a delivery in "assigned" state; reassignment captures the new actor and timestamp.
  - Reassignment is rejected once a delivery has dispatched (status != "assigned").
  - Agent eligibility is gated by a port (DeliveryAgentEligibilityPort) and assignment fails with DeliveryAgentNotEligibleError when the user does not hold an agent role at the origin location.
  - Re-assigning to the same user is a noop and does not re-stamp timestamps.
size: small
---

## Why

E-00C-02 shipped the `assign` transition (`draft -> assigned`) but did not gate which users can be assigned, and it had no path for changing the assignee after the initial assignment. Managers need both: a dedicated `reassign` method that allows `assigned -> assigned` with a different user while the delivery has not dispatched, and a check that the assigned user is actually a delivery agent for the origin location.

## Out of scope

- Reassign after dispatch (`in_transit`) is not allowed in this epic. Re-routing in flight is a different concern.
- Cancelling a current assignment without reassigning is already covered by E-00C-02 `cancel`.
- Agent-side acknowledgement / acceptance flow is owned by E-15 (delivery agent portal).

## Design

Light tier: extends E-00C-02's compose helper. No new schema. No architect call.

- New method `reassign` on `DeliveryStatusService`: bypasses the canonical state machine since `assigned -> assigned` is not a normal edge. It uses the same CAS pattern (`UPDATE ... WHERE status = 'assigned'`) but the policy gate is replaced by a status-equality check.
- New port `DeliveryAgentEligibilityPort` in `packages/contracts/src/deliveries.ts`. One method: `isEligibleAgent({ userId, locationId })`.
- Runtime default is `PostgresDeliveryAgentEligibilityAdapter`, which checks for an active user with an active `agent` role at the delivery origin location.
- The existing `assign` method now calls the eligibility port before the policy gate.
- Two errors support structured failures: `DeliveryAgentNotEligibleError` (400) and `DeliveryReassignmentNotAllowedError` (409).
- Two error codes are in `DELIVERY_ERROR_CODES`: `agentNotEligible`, `reassignmentNotAllowed`.

## Tasks

1. Extend contracts: `reassignDeliveryRequestSchema`, `DeliveryAgentEligibilityPort`, and two delivery error codes.
2. Extend errors: `DeliveryAgentNotEligibleError`, `DeliveryReassignmentNotAllowedError`.
3. Extend service interface with `reassign`.
4. Compose: add `reassign` with its own transaction body and extend `assign` with eligibility checking.
5. Runtime: inject eligibility port, defaulting to the real Postgres agent-role adapter.
6. Seed managers with `deliveries.assign` and `deliveries.reassign`; require `agent` roles to be location-scoped.
7. Service tests for reassign happy path, post-dispatch rejection, same-user noop, ineligible reassign, and ineligible assign.
8. Route tests for origin-scoped reassign authorization and structured 400/409 error mapping.

## Ready-To-Ship Evidence

- `assign` and `reassign` both call `DeliveryAgentEligibilityPort` before writing assignment state.
- Runtime uses `PostgresDeliveryAgentEligibilityAdapter` by default, so inactive or non-agent assignees are rejected in live wiring instead of only in service tests.
- Reassign uses the same transaction/CAS write path as status transitions, stamps the new assignee, actor, and timestamp through the repository input, and includes a repository-side active-agent predicate for the reassign write.
- Route-level coverage verifies `POST /api/deliveries/:deliveryId/reassign` checks delivery-origin permission before service invocation.
- Checks passed:
  - `pnpm --filter @shop/api build`
  - `pnpm --filter @shop/api test`
  - `pnpm --filter @shop/api exec tsx --test test/delivery-status.service.test.ts test/delivery-agent-assignment.service.test.ts test/delivery-agent-eligibility.adapter.test.ts`
