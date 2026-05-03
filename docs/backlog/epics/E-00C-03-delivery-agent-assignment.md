---
id: E-00C-03
title: Assign and reassign deliveries to agents
status: built
priority: P0
domain: backend
owner: claude
parents: [E-00C-02]
acceptance:
  - Manager can assign a delivery to an agent (already shipped via E-00C-02 assign).
  - Manager can reassign an agent on a delivery in "assigned" state; reassignment captures the new actor and timestamp.
  - Reassignment is rejected once a delivery has dispatched (status != "assigned").
  - Agent eligibility is gated by a port (DeliveryAgentEligibilityPort) — assignment fails with DeliveryAgentNotEligibleError when the user does not hold an agent role at the origin location.
  - Re-assigning to the same user is a noop and does not re-stamp timestamps.
size: small
---

## Why

E-00C-02 shipped the `assign` transition (`draft → assigned`) but didn't gate which users can be assigned, and it had no path for changing the assignee after the initial assignment. Managers need both: a dedicated `reassign` method that allows `assigned → assigned (different user)` while the delivery hasn't yet dispatched, and a check that the user being assigned is actually a delivery agent for the origin location.

## Out of scope

- The actual role-checking logic — shipped as a stub adapter that always returns true. Real adapter wires to the access-control module in a follow-up commit.
- Reassign after dispatch (`in_transit`) — not allowed in this epic. Re-routing in flight is a different concern.
- Cancelling a current assignment without reassigning — already covered by E-00C-02 `cancel`.
- Agent-side acknowledgement / acceptance flow — owned by E-15 (delivery agent portal).

## Design

Light tier — extends E-00C-02's compose helper. No new schema. No architect call.

- New method `reassign` on `DeliveryStatusService` — bypasses the canonical state machine since `assigned → assigned` isn't a normal edge. It uses the same CAS pattern (`UPDATE ... WHERE status = 'assigned'`) but the policy gate is replaced by a status-equality check.
- New port `DeliveryAgentEligibilityPort` in `packages/contracts/src/deliveries.ts`. One method: `isEligibleAgent({ userId, locationId })`.
- Stub adapter `DeliveryAgentEligibilityStubAdapter` returns `true` until the access-control wiring lands.
- The existing `assign` method now calls the eligibility port before the policy gate (transition private method extended with an optional `eligibilityCheck` hook).
- Two new errors: `DeliveryAgentNotEligibleError` (400) and `DeliveryReassignmentNotAllowedError` (409).
- Two new error codes in `DELIVERY_ERROR_CODES`: `agentNotEligible`, `reassignmentNotAllowed`.

## Tasks (collapsed into one commit)

1. Extend contracts: `reassignDeliveryRequestSchema`, `DeliveryAgentEligibilityPort`, two new error codes.
2. Extend errors: `DeliveryAgentNotEligibleError`, `DeliveryReassignmentNotAllowedError`.
3. Extend service interface with `reassign` method.
4. Compose: add `reassign` (its own withTransaction body, bypasses state-machine policy) + extend `assign` with eligibility hook.
5. Stub adapter `DeliveryAgentEligibilityStubAdapter`.
6. Runtime: inject eligibility port (default to stub).
7. Service tests for: reassign happy path, reassign-after-dispatch rejected, reassign-same-user noop, ineligible-agent rejection on assign + reassign.
