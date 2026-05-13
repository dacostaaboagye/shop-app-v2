---
id: E-01-01
title: Staff provisioning surfaces (admin + manager-scoped)
status: shipped
priority: P1
domain: full-stack
owner: codex
parents: []
acceptance:
  - Admin can create a staff user from the admin portal using the existing `POST /api/admin/access/users` backend path.
  - Managers can create worker users from the manager portal, scoped only to locations where they effectively hold `access.assignments.manage`.
  - A shared `StaffProvisioningService` is the only service path that creates workforce users through this provisioning flow.
  - The manager create response never reveals whether an email or slug already exists outside the manager's visible scope.
  - Every created user is created without a password, has `requiresPasswordChange = true`, receives append-only role/audit evidence, and emits an `access.user.created` platform event.
size: medium
---

## Why

The backend for internal staff creation exists, but the admin portal has no create-user UI, so operators cannot use the shipped API without curl or Postman. The scope now also includes manager-side worker provisioning: a manager should be able to add workers for the locations they already manage without gaining global admin access.

This epic delivers both surfaces while preserving the operations-auth boundary from ADR 0021: workforce accounts are internally provisioned, explicitly scoped, and activated through the existing password setup/reset flow.

## Out of scope

- Bulk or CSV staff provisioning.
- Reactivating a departed worker whose email already exists.
- Dedicated invite emails and resend-invite UX.
- Customer registration or customer OAuth.
- Supplier/agent staff provisioning.
- Constant-time manager conflict responses. The manager response is generic, but timing side channels are accepted as low risk because callers are authenticated and audited.
- Partitioning `permission_audit_log`.
- T2 event-worker retry policy.

## Current State

Backend facts verified from code:

- `POST /api/admin/access/users` exists in `apps/api/src/modules/admin/admin-user-access.routes.ts`.
- It requires `access.assignments.manage`.
- It validates `adminCreateUserRequestSchema`.
- The current public request shape is `roleAssignments[]`, not a singular `roleAssignment`.
- `AdminStaffProvisioningService` creates the user through `PostgresAdminStaffProvisioningRepository`.
- New users are inserted with `passwordHash = null`, `emailVerified = false`, and `requiresPasswordChange = true`.
- The platform event type is currently `access.user.created`.
- The admin route already has route rate limiting at `20 / 15 minutes`, but the current route-rate-limit helper is IP-keyed, not actor-keyed.
- Protected routes use bearer access tokens; the browser access token is held in memory via `useAuthSessionStore`, while the refresh token is an HTTP-only cookie scoped to `/api/auth`.

Frontend facts verified from code:

- `/admin/access/users` exists and lists users.
- `/admin/access/users/new` does not exist.
- `apps/web/src/lib/react-query/admin-user-access.ts` has no create-user helper yet.
- `/manager/staff` exists as a GET-backed page.
- `/manager/staff/new` does not exist.

## Architecture

### Routes

Two route namespaces remain intentional:

- `POST /api/admin/access/users`
- `POST /api/manager/staff`

The existing `GET /api/manager/staff` route remains the manager staff list. The new manager create route shares the URL path and differs by method.

Admin route:

- Uses the existing `adminCreateUserRequestSchema`.
- Keeps `config.access = { kind: "permission", permission: "access.assignments.manage" }`.
- This remains a global permission check because the route has no request location context.
- Admins may assign any valid role set the service allows, subject to role scope rules.

Manager route:

- Uses a new manager-specific contract instead of exposing the admin contract directly.
- Recommended request shape:

```ts
{
  email: string;
  firstName: string;
  lastName: string;
  reason: string;
  locationSlugs: string[];
}
```

- The manager request does not include `roleSlug`. Worker role is implicit in the route.
- The route maps `locationSlugs` into normalized internal role assignments:

```ts
locationSlugs.map((locationSlug) => ({
  roleSlug: "worker",
  locationSlug,
}))
```

- Route access should be `config.access = { kind: "permission", permission: "access.assignments.manage", scope: "any_active" }`.
- The `any_active` check only proves the actor has the provisioning permission somewhere. The route middleware cannot inspect POST body `locationSlugs`, so it must not be treated as the final authorization check.
- The final subset check belongs inside the shared service/repository transaction.

### Permission Model

Reuse `access.assignments.manage`; do not add `workers.provision.*`.

Reason:

- The codebase uses permission keys like `<domain>.<action>`.
- Scope is determined by resolution mode and assignment location, not by encoding scope into the permission key.
- Reusing the existing permission avoids a parallel "can create but cannot manage access" model before product actually needs that split.

Important implementation consequence:

- The current seeded `manager` role does not include `access.assignments.manage`.
- To make manager-created workers the default manager capability, add `access.assignments.manage` to the seeded manager role and rely on managers being assigned that role at specific locations.
- Do not create global manager assignments unless global manager authority is intended.

If product later wants managers to create workers but not suspend, force-reset, or edit access, split this into a narrower permission in a separate migration.

### Shared Service

Rename `AdminStaffProvisioningService` to `StaffProvisioningService` when the manager backend lands.

The service should accept normalized input:

- actor: `userId`, `userSlug`, and route-derived `actorRole` (`admin` or `manager`)
- account fields: normalized email, first name, last name, reason
- role assignments: one or more `{ roleSlug, locationSlug }` records
- policy: allowed roles and location policy
- now

The route remains thin:

- validate public request
- authenticate/authorize at the API boundary
- normalize route-specific request shape
- call service
- map service result to public response

The service owns invariants:

- reject roles outside the allowed role set
- reject missing location where the role requires a location
- reject manager requests with zero locations
- reject location count above the form-path cap
- reject inactive/decommissioned locations
- reject self-provisioning by comparing requested email with the actor email fetched server-side
- run the transaction
- publish the event after commit on a best-effort basis

### Manager Location Authorization

The manager route cannot trust the client location picker. The service/repository must validate the submitted `locationSlugs` inside the same database transaction used to create the user.

Transaction flow:

1. Start transaction.
2. Set serializable isolation if supported by the current Drizzle/Neon transaction path; otherwise run the permission/location recheck immediately before insert and document the residual race.
3. Load requested active locations by slug and fail if any requested slug is missing, inactive, duplicated, or decommissioned.
4. Load actor email for self-provisioning prevention.
5. Resolve the actor's effective `access.assignments.manage` location scope from database state inside the transaction, using location ids.
6. Verify requested location ids are a subset of the actor's effective scope.
7. Insert user.
8. Insert role assignment rows and append-only `permission_audit_log` rows.
9. Commit.
10. Publish `access.user.created` after commit. If publishing fails, return success and log a sanitized operator error.

Permission reads inside this transaction must not use request/session caches.

### Events And Audit

Keep platform event type `access.user.created`.

Do not rename the event type to `staff-user-created`; that would diverge from the existing event taxonomy and tests. The implementation helper may be renamed from `createAdminUserCreatedEvent` to `createStaffUserCreatedEvent`.

Add payload fields:

- `actorRole`: `admin` or `manager`
- `actorUserSlug`
- `roleAssignmentCount`
- `userSlug`
- `reason`

Avoid placing full email addresses in info-level logs. If the event payload keeps email for audit visibility, that is event data, not log data; consumers must treat it as PII.

`permission_audit_log` remains the access-change record of truth. Its `actor_id` points to the inviter.

### Error Semantics

Admin path:

- Duplicate email remains a normal conflict response with useful detail.
- Slug collision is retried internally up to the configured attempt limit.
- Validation errors are field-addressable on the frontend where possible.

Manager path:

- Email conflict, slug exhaustion, stale/out-of-scope location, and inactive location all map to a generic `provisioning_failed` problem.
- The public response uses the existing problem-details `requestId` as the support correlation id.
- The real cause is logged server-side with structured fields, masked email, actor slug, and request id.
- Rate-limit responses remain explicit `rate_limited`; they do not need to hide existence information.

### Input Validation

Shared constraints:

- `email`: trim, lowercase, valid email, max length 254.
- `firstName`, `lastName`: trim, length 1-80 for new forms, reject `<` and `>` as defense in depth.
- `reason`: required, trim, max length 500.

Admin constraints:

- `roleAssignments`: array min 1, max 10, matching the existing admin contract.
- Each role assignment has `roleSlug` and nullable `locationSlug`.
- Roles that require location scope must include `locationSlug`.

Manager constraints:

- `locationSlugs`: array min 1, max 10.
- No `roleSlug` field in the public request.
- Service always maps to worker role and still enforces `allowedRoles = new Set(["worker"])`.

### Rate Limiting

Keep the existing admin create route limit unless product wants it changed: `20 / 15 minutes`.

For manager create, add an actor-aware limit equivalent to `20 / 15 minutes` after authentication. The current route-rate-limit helper is IP-keyed and runs before route authorization, so it cannot satisfy a per-actor requirement as-is.

Acceptable implementation options:

- add a small authenticated pre-handler rate-limit helper keyed on `request.auth.userId`
- or enhance `registerConfiguredRouteRateLimit` to support actor keys and run after `registerRouteAuthorization`

Do not replace the global IP limit; use actor-aware limiting as an additional abuse control.

### Security Posture

Protected assets:

- workforce identity records
- role assignments and permission history
- location-scoped operational authority
- auth email/reset flows

Main threats and mitigations:

- Compromised manager bearer token can create workers at managed locations: mitigated by bearer-only auth, immediate DB-backed permission resolution, location subset validation, rate limiting, and audit.
- Manager probes email existence: manager response is generic and uses `requestId` for support.
- Client tampers role/location payload: manager contract exposes no role field, service enforces worker-only and location subset.
- Manager loses access mid-request: transaction rechecks permission against database state immediately before insert; serializable isolation is preferred.
- XSS steals bearer: current frontend keeps access token in memory, not localStorage; preserve that.
- CORS/CSRF: protected API routes require bearer tokens; refresh-token cookie is scoped to `/api/auth`. Do not introduce cookie-auth provisioning routes.
- PII in logs: use structured request logger, mask email, include request id, never `console.error(error)` with raw objects.

Residual risks:

- Timing differences may still reveal some conflict information to a patient authenticated attacker.
- Event publication remains best-effort until T2 retry policy lands.
- No idempotency key means a network timeout after successful commit may look like a failed create followed by conflict on retry.

## User Journeys

### Admin Creates Staff

1. Admin opens `/admin/access/users`.
2. Admin selects `Create user`.
3. Admin completes `/admin/access/users/new`:
   - first name
   - last name
   - email
   - reason
   - one or more role/location assignments
4. Admin submits.
5. On success, the UI routes to `/admin/access/users/{slug}` and shows the setup instruction from the API.
6. On duplicate email, the email field shows the conflict and the admin stays on the form.
7. On validation or network failure, the form keeps values and surfaces a safe retry path.

### Manager Creates Worker

1. Manager opens `/manager/staff`.
2. Manager selects `Add worker`.
3. Manager completes `/manager/staff/new`:
   - first name
   - last name
   - email
   - reason
   - location picker from locations where `access.assignments.manage` is present
4. Role is not shown; worker is implicit.
5. On success, the UI routes back to `/manager/staff` and shows the setup instruction.
6. On generic provisioning failure, the UI shows: "We couldn't create this worker. Reference: {requestId}. Contact support if this keeps happening."
7. On rate limit, the UI shows the retry message from problem details and does not navigate away.

### Worker Sets Password

1. Inviter tells the worker to open the sign-in page and use Forgot password with the provisioned email.
2. Worker submits Forgot password.
3. Worker receives the reset email through the existing recovery flow.
4. Worker sets a password.
5. Password reset clears the setup-required state according to the existing auth flow.
6. Worker signs in and is routed by their portal access.

This epic intentionally keeps the current inviter-conveyed setup path. Dedicated invite email is a follow-up, not a blocker.

## PR Slicing

### PR 1 - Admin Frontend

- Add `createAdminUser` helper to `apps/web/src/lib/react-query/admin-user-access.ts`.
- Add `/admin/access/users/new`.
- Use TanStack Form and existing form wrappers.
- Add a `Create user` action on the user list, permission-gated by `access.assignments.manage`.
- Fetch role/location options from existing admin access/location query surfaces.
- Tests: form validation, mutation payload, duplicate-email handling, success navigation.

### PR 2 - Shared Service Refactor

- Rename service/repository types from admin-only naming to staff provisioning naming.
- Keep the admin public API unchanged.
- Add allowed-role enforcement.
- Add service-level location policy hook.
- Keep event type `access.user.created`; add `actorRole` and `actorUserSlug` to payload.
- Replace `console.error` event-publish failure with structured sanitized logging.
- Tests: existing admin route/service tests still pass, allowed-role rejection, event payload includes actor role.

### PR 3 - Manager Backend And Frontend

- Add manager create-worker contract under `packages/contracts`.
- Add `POST /api/manager/staff` alongside the existing GET route.
- Add `access.assignments.manage` to the seeded manager role if manager-created workers should be default for all location managers.
- Gate route with `access.assignments.manage` using `scope: "any_active"`.
- Enforce worker-only and location-subset checks inside the transaction.
- Add actor-aware rate limiting.
- Add `/manager/staff/new`.
- Use the manager's effective `access.assignments.manage` location scopes for the picker.
- Tests: manager outside scope refused, non-worker role cannot be injected, missing/empty locations rejected, email conflict is generic, request id is surfaced, actor rate limit works, no raw ids in create response.

## ADR Impact

No new ADR is required. ADR 0021 already says workforce users are created internally by authorized admins or managers and use password setup/reset. This epic is the implementation design for that accepted direction.

Update ADR 0021 only if the product changes the setup model from inviter-conveyed Forgot password to dedicated invitation tokens/emails.

## Related PRs

- [PR #154](https://github.com/dacostaaboagye/shop-app-v2/pull/154) - `feat(e-01-01): complete staff provisioning surfaces`

## Shipped Evidence

- Merged to `dev` on 2026-05-13 at 12:59 UTC.
- Merge commit: `9baecc18c4d91624d7202470e45fee813b9edfa5`.
- CI `validate`: passed.
- Local validation before PR: `pnpm verify`.
- Acceptance evidence covers admin staff creation, manager location-scoped worker provisioning, optional admin profile upload, staff-surface entry points, safe manager error semantics, and responsive manager staff metrics.
