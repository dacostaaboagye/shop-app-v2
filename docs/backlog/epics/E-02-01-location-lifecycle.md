---
id: E-02-01
title: Create and manage store and warehouse locations
status: done
priority: P1
domain: backend
owner: claude
parents: []
acceptance:
  - The admin location list and detail responses expose all managers as an array, not just one manager; the read shape matches the actual many-to-many model.
  - Granting the `manager` role with `locationSlug=X` is the single canonical way to make user M a manager of location X through `POST /api/admin/access/users/:slug/roles`.
  - The vestigial `locations.manager_id` column is dropped; it duplicated user_roles and was never the source of truth.
  - Frontend admin location screens render the full manager list, not a single manager name.
size: small
---

## Why

EPIC2's user story says "I can assign a shop manager to a location" in singular form. In reality, a shop can have multiple managers and a manager can manage multiple shops. This was already supported by the existing `user_roles` table, which has `locationId` and is append-only with revoke, but two artifacts in the code obscured that:

1. A vestigial `locations.manager_id` FK column that was never written by any service path. Read code (`postgres-admin-location-staff-query.ts`) merged it into the staff list, creating a second source of truth that was not actually maintained.
2. The admin list response shape (`managerName: string | null`) showed only one manager by picking the most recently assigned via SQL `LIMIT 1`, even when several users had the manager role at that location.

This epic consolidates the model by dropping the dead column, changing the response shape to `managers: Array<{ userSlug, name }>`, and removing the merge logic.

## Scope (revised after code survey)

The system is already many-to-many. Existing endpoints support it:

- `POST /api/admin/access/users/:slug/roles` with `{ roleSlug: "manager", locationSlug: <slug> }` appoints a user as manager at that location.
- `DELETE /api/admin/access/users/:slug/roles/:roleSlug` with `{ locationSlug: <slug> }` removes that location-scoped role.

We do not need new endpoints. We needed to fix the read shape and remove the dead column.

## Out of scope

- New manager-assignment endpoints, which would duplicate `assignRole`.
- Deactivation guard ("flag for resolution"). This is cross-module and belongs in a separate ticket if still needed.
- Frontend portal pages beyond admin location detail/list. Manager portal etc. update when they read `managers[]`.

## Decisions

- Drop `locations.manager_id`. It was never written; merge logic in staff query treated it as a parallel source of truth that nothing maintained. This is cleanup, not a behavior change. No data migration was needed.
- Use `managers: Array<{ userSlug, name }>` in `admin.ts` list/detail responses. Empty array means no manager-role assignments exist.
- Replace `managerNameSql()` with `managersSql()`, returning a JSON array of all active manager-role users at the location ordered by `assignedAt`.
- Simplify `postgres-admin-location-staff-query.ts` by removing the `manager_id` branch and `mergeLocationManagerStaff` helper. The `user_roles` query already returns all manager-role users at the location.

## Tasks (one PR)

1. Schema: drop `locations.manager_id` column and relations. Migration.
2. `admin.ts` contract: change `managerName` to `managers` array.
3. `postgres-admin-location-query.repository.ts`: replace `managerNameSql()` with `managersSql()`.
4. `postgres-admin-location-staff-query.ts`: simplify by removing the `manager_id` branch.
5. `postgres-admin-location-write.repository.ts`: update response to return `managers: []` instead of `managerName: null`; newly created locations have no manager-role assignments yet.
6. Update `admin-location-write.ts` contract if it has a list response shape that references `managerName`.
7. Frontend: update three components reading `managerName`: `location-detail-summary-card`, `location-detail-view`, `location-table-columns`.
8. Tests: contract round-trip for the new shape; existing tests updated.

## Shipped evidence

- PR #79: https://github.com/dacostaaboagye/shop-app-v2/pull/79
- Merged to `dev` on 2026-05-02.
- Merge commit: `b19796a3196eaaf530f0a4ee84c527a21d2dfd40`.
- CI `validate`: passed on 2026-05-02 at 14:13 UTC.

Acceptance evidence:

- Admin location list/detail contracts expose `managers: Array<{ userSlug, name }>` instead of `managerName`.
- `locations.manager_id` was removed by migration `0040_nervous_daimon_hellstrom.sql`, and `user_roles.locationId` remains the canonical persistence source behind the public `locationSlug` assignment contract.
- Admin location repositories now aggregate active manager role grants and return all assigned managers.
- Admin location UI surfaces render the full manager list with an empty-state fallback.

Backlog reconciliation:

- The xlsx audit note said most CRUD, zones, and deactivation guard work was pending.
- PR #79's code survey found create/update location and zone CRUD already present; the real E-02-01 gap was the manager read shape and dead manager column.
- Deactivation guard is cross-module and remains out of scope for this ticket unless the PO creates a separate backlog item.

## Open question (orchestrator to user)

The removed `mergeLocationManagerStaff` logic showed a "manager-of-record" who might not have the role grant. Treat this as dead code unless the PO creates a future ticket for a "designated but not yet onboarded" manager concept. The current single source of truth is `user_roles`.
