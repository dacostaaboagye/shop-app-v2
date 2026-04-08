# Authentication Schema

Backlog ticket: `E-01-01`

This document records the persistence shape that supports user registration, password login, refresh-token rotation, account lockout, and immediate session revocation.

## Tables

### `users`

Owns the canonical identity record for a person who can authenticate into the platform.

Columns relevant to `E-01-01`:

- `id`: internal UUID primary key. Never exposed in public DTOs.
- `slug`: public-facing user identifier used in API responses.
- `first_name`, `last_name`, `email`: registration and login identity fields.
- `password_hash`: bcrypt hash for the current password credential.
- `status`: `active`, `suspended`, or `deactivated`.
- `preferred_portal`: nullable portal preference carried in the auth session response.
- `last_login_at`: last successful interactive login timestamp.
- `locked_until`: active lockout boundary after repeated failed logins.
- `requires_password_change`: workflow flag reserved for follow-on auth stories.
- `created_at`, `updated_at`: standard audit timestamps.

Indexes and constraints:

- unique `slug`
- unique `email`
- index on `status`

### `refresh_tokens`

Stores browser-session refresh credentials as hashed server records. Raw refresh tokens are not persisted.

Columns relevant to `E-01-01`:

- `id`: internal UUID primary key.
- `user_id`: owning user reference.
- `token_hash`: SHA-256 hash of the refresh token secret.
- `issued_at`: session issuance timestamp.
- `expires_at`: absolute refresh-token expiry timestamp.
- `revoked_at`: nullable revocation timestamp.
- `revoked_reason`: nullable human-readable revocation reason.
- `ip_address`, `user_agent`: request metadata captured for audit and support review.

Indexes and constraints:

- index on `user_id`
- unique index on `token_hash` to prevent duplicate session records under concurrent login load

### `login_attempts`

Append-only record of authentication attempts used to evaluate lockout state.

Columns relevant to `E-01-01`:

- `email`: normalized login identifier attempted by the client.
- `ip_address`: optional request origin metadata.
- `succeeded`: whether the attempt authenticated successfully.
- `occurred_at`: time of the attempt.
- `lockout_window_minutes`: policy snapshot for the evaluated lockout window.

Indexes and constraints:

- index on `email`

### `auth_events`

Append-only audit trail for security-sensitive auth actions.

Columns relevant to `E-01-01`:

- `user_id`: nullable when the attempted email does not resolve to a user.
- `event_type`: `login`, `logout`, `failed_attempt`, `lockout`, or `token_refresh`.
- `ip_address`, `user_agent`: request metadata.
- `occurred_at`: event timestamp.

Indexes and constraints:

- index on `user_id`

## Runtime mapping

- Registration writes `users`, ensures a `basic_user` entry in `roles`, and appends a `user_roles` assignment.
- Successful login updates `users.last_login_at`, appends `login_attempts` and `auth_events`, and inserts a new `refresh_tokens` record.
- Refresh rotates the session by revoking the previous `refresh_tokens` row and inserting a replacement row.
- Logout revokes the active `refresh_tokens` row and records an auth event.
- Deactivation or suspension is enforced on every protected request by reloading the user from `users` instead of trusting the JWT alone.

## Supporting artifacts

- Schema source: [identity.ts](/D:/work/personal/shop-app/shop-app-v2/packages/database/src/schema/identity.ts)
- Access-control schema used during registration: [access-control.ts](/D:/work/personal/shop-app/shop-app-v2/packages/database/src/schema/access-control.ts)
- Generated migration: [0000_pretty_gambit.sql](/D:/work/personal/shop-app/shop-app-v2/packages/database/drizzle/0000_pretty_gambit.sql)
