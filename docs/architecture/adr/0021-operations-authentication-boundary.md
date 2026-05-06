# ADR 0021: Operations Authentication Boundary

## Status

Accepted.

## Context

Shop App V2 currently serves the operations workforce portal: administrators,
managers, and workers who affect inventory, financial documents, permissions,
and operational evidence.

Public self-registration and external social sign-in are a poor fit for that
trust boundary. A public registration or OAuth entry point allows untrusted
actors to create or enter identities inside the same account system used for
privileged operational workflows. Even when a default role is low privilege, it
expands the attack surface for enumeration, session abuse, OAuth linking
mistakes, role-escalation bugs, notification abuse, and future permission
mistakes.

The ecommerce customer experience is a different actor model. Customers may
need public account creation, checkout, and profile flows. Those flows will be
owned by the future ecommerce app in the monorepo while still using the same
backend deployment. The shared backend must enforce portal-specific auth policy
so customer self-registration cannot create or mutate workforce identities by
accident.

External guidance supports this separation:

- OWASP Authentication Cheat Sheet: authentication and recovery flows must be
  designed around clear account lifecycle and abuse-resistance controls.
- NIST SP 800-63 digital identity guidance: enrollment and account recovery are
  identity lifecycle events that need explicit process controls.
- Microsoft Entra lifecycle workflow and provisioning guidance: enterprise
  workforce identities are commonly managed through joiner, mover, and leaver
  provisioning rather than public sign-up.

## Decision

The operations portal is internal-credential sign-in only.

- Public `POST /api/auth/register` does not create operations users or issue a
  session.
- Public `GET /api/auth/oauth/google` and
  `GET /api/auth/oauth/google/callback` do not start or complete operations
  sign-in.
- The operations web app does not expose a registration page, registration
  form, "create account" navigation path, or Google sign-in action.
- Workforce users are created internally by authorized administrators or
  managers through a controlled user-management flow.
- Newly created workforce users must be provisioned with explicit role and
  location scope, and must set their password through a controlled setup/reset
  flow before signing in.
- Customer self-registration belongs to the future ecommerce app and should use
  a separate backend route namespace, UI surface, and threat model on the shared
  API.
- The shared backend must keep workforce and customer account lifecycle rules
  explicit rather than using one generic registration endpoint for both actor
  types.
- Future customer OAuth, if needed, belongs under a customer-owned namespace
  and must not share the operations OAuth route.

## Immediate Implementation

This ADR intentionally makes the smallest safe change first:

1. block the current public operations registration API route
2. redirect `/register` to `/login`
3. block the current operations Google OAuth API routes
4. remove registration links, Google sign-in, and the operations registration
   form/client helper
5. update auth documentation to describe the split

Recommended shared-backend namespace direction:

- operations workforce sign-in: `POST /api/auth/login`
- operations workforce registration: disabled at `POST /api/auth/register`
- operations workforce OAuth: disabled at `GET /api/auth/oauth/google`
- future ecommerce customer registration: `POST /api/customer/auth/register`
  or equivalent customer-owned namespace
- future ecommerce customer OAuth: `GET /api/customer/auth/oauth/google` or
  equivalent customer-owned namespace, only if product requirements justify it

## Follow-Up Direction

The internal staff provisioning flow should be delivered as a separate backlog
slice:

1. add an authorized `POST /api/admin/access/users` or equivalent staff-invite
   route
2. create the user transactionally with role and location scope
3. require a password setup/reset before first login
4. record audit events for creator, assigned roles, location scopes, and setup
   lifecycle
5. add UAT for admin-created manager, manager-created worker, duplicate email,
   suspended location, and revoked invitation scenarios

## Consequences

Benefits:

- the operations system no longer accepts anonymous account creation
- workforce identity lifecycle becomes an administrative control point
- customer registration and OAuth can evolve independently without weakening
  operations security
- sign-in failures become easier to reason about because every operations user
  must have an internal lifecycle owner

Tradeoffs:

- onboarding now depends on an internal staff provisioning feature
- ecommerce registration requires a separate implementation instead of reusing
  the operations form, but it can still run on the same backend
- ecommerce OAuth, if added, requires a separate implementation instead of
  reusing the operations OAuth route, but it can still run on the same backend
- existing tests and documentation that assumed public registration must be
  updated
