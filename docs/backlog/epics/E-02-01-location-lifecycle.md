---
id: E-02-01
title: Create and manage store and warehouse locations
status: planned
priority: P1
domain: backend
owner: claude
parents: []
acceptance:
  - The admin location list and detail responses expose all managers (array), not just one — the read shape matches the actual many-to-many model.
  - Granting the `manager` role with `locationId=X` is the single canonical way to make user M a manager of location X (existing flow via /api/admin/users/:userSlug/access/role-grants).
  - The vestigial `locations.manager_id` column is dropped — it duplicated user_roles and was never the source of truth.
  - Frontend admin location screens render the full manager list, not a single manager name.
size: small
---

## Why

EPIC2's user story says "I can assign a shop manager to a location" — singular. In reality, a shop can have multiple managers and a manager can manage multiple shops. **This was already supported** by the existing `user_roles` table (which has `locationId` and is append-only with revoke), but two artifacts in the code obscured that:

1. A vestigial `locations.manager_id` FK column that was never written by any service path. Read code (`postgres-admin-location-staff-query.ts`) merged it into the staff list, creating a second source of truth that wasn't actually being maintained.
2. The admin list response shape (`managerName: string | null`) showed only one manager — picking the most recently assigned via SQL `LIMIT 1` — even when several users had the manager role at that location.

This epic consolidates: drop the dead column, change the response shape to `managers: Array<{userSlug, name}>`, and remove the merge logic.

## Scope (revised after code survey)

**The system is already many-to-many.** Existing endpoints support it:

- `POST /api/admin/users/:userSlug/access/role-grants` with `{ roleSlug: "manager", locationId: <slug> }` — appoints a user as manager at that location.
- `POST /api/admin/users/:userSlug/access/role-grants/:grantId/revoke` — removes them.

We don't need new endpoints. We need to fix the **read shape** and remove the dead column.

## Out of scope

- New manager-assignment endpoints (would duplicate `assignRole`).
- Deactivation guard ("flag for resolution"). Cross-module — separate epic `ops-location-deactivation-guard`.
- Frontend portal pages beyond admin location detail/list. Manager portal etc. update when they read `managers[]`.

## Decisions

- **Drop `locations.manager_id`**. Never written; merge logic in staff query treated it as a parallel source of truth that nothing maintained. Cleanup, not a behaviour change. No data migration needed.
- **`managers: Array<{userSlug, name}>`** in `admin.ts` list/detail response. Empty array when no manager-role assignments exist.
- **`managersSql()`** replaces `managerNameSql()` — returns a JSON array of all active manager-role users at the location, ordered by `assignedAt`.
- **`postgres-admin-location-staff-query.ts`** — drop the `manager_id` lookup branch and `mergeLocationManagerStaff` helper. The `user_roles` query already returns all manager-role users at the location.

## Tasks (one PR)

1. Schema: drop `locations.manager_id` column + relations. Migration.
2. `admin.ts` contract: change `managerName` → `managers` array.
3. `postgres-admin-location-query.repository.ts`: replace `managerNameSql()` with `managersSql()`.
4. `postgres-admin-location-staff-query.ts`: simplify by removing the `manager_id` branch.
5. `postgres-admin-location-write.repository.ts`: update response to return `managers: []` instead of `managerName: null` (newly created locations have no manager-role assignments yet).
6. Update `admin-location-write.ts` contract if it has a list response shape that references `managerName`.
7. Frontend: update three components reading `managerName` (`location-detail-summary-card`, `location-detail-view`, `location-table-columns`).
8. Tests: contract round-trip for the new shape; existing tests updated.

Net change estimate: ~150 LOC across packages/contracts, packages/database, apps/api, apps/web.

## Open question (orchestrator → user)

The existing `mergeLocationManagerStaff` logic showed a "manager-of-record" who might NOT have the role grant. Is that a real product concept (designated manager who hasn't been onboarded yet) or just dead code? **Recommended**: treat as dead code — single source of truth via `user_roles`. If a "designated but not yet onboarded" concept is real, it's a future epic with its own ticket.
