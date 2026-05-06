# Auth API Reference

Backlog ticket: `E-01-01`

## Session model

- Access tokens are returned in the JSON response body.
- Refresh tokens are issued only as the `shop_refresh_token` HTTP-only cookie.
- Refresh and logout requests depend on that cookie and do not accept refresh tokens in the request body.
- Protected routes authenticate the bearer access token and re-check user status on every request.

## `POST /api/auth/register`

Operations registration is disabled. Workforce accounts are created internally
by an authorized administrator or manager, then completed through a controlled
password setup/reset flow.

Customer self-registration belongs to the future ecommerce app and must use a
separate route namespace, UI surface, and threat model on the same backend.

Recommended shared-backend namespace direction:

- operations workforce sign-in: `POST /api/auth/login`
- operations workforce registration: disabled at `POST /api/auth/register`
- future ecommerce customer registration: `POST /api/customer/auth/register`
  or equivalent customer-owned namespace

Failure responses:

- `403 forbidden`: registration is disabled for the operations portal

## `GET /api/auth/oauth/google`

Operations OAuth is disabled. Workforce accounts use internal account
credentials provisioned through administrator or manager workflows.

Customer OAuth, if needed, belongs to the future ecommerce app and must use a
separate route namespace on the same backend.

Recommended shared-backend namespace direction:

- operations workforce OAuth: disabled at `GET /api/auth/oauth/google`
- future ecommerce customer OAuth: `GET /api/customer/auth/oauth/google` or
  equivalent customer-owned namespace

Failure responses:

- `403 forbidden`: OAuth is disabled for the operations portal

## `POST /api/auth/login`

Validates credentials, applies lockout rules, issues a new access token, and rotates the refresh-token cookie.

Request body:

```json
{
  "email": "manager@example.com",
  "password": "Password123!"
}
```

Failure responses:

- `401 unauthorized`: invalid credentials
- `401 unauthorized`: account locked, includes `remainingLockoutSeconds`
- `403 forbidden`: account suspended or deactivated

## `POST /api/auth/refresh`

Reads the HTTP-only refresh-token cookie, validates the backing session record, revokes the previous refresh token, issues a new access token, and rotates the cookie.

Request body: none

Failure responses:

- `401 unauthorized`: missing, expired, revoked, or invalid refresh session
- `503 internal_error`: auth runtime misconfigured

## `POST /api/auth/logout`

Revokes the current refresh-token cookie-backed session and clears the cookie.

Request body: none

Success response:

- `204 No Content`

Failure responses:

- `401 unauthorized`: missing or invalid refresh session
- `503 internal_error`: auth runtime misconfigured

## Token rules

- Access-token payload fields are limited to `user_id`, `slug`, `issued_at`, and `expires_at`.
- Tokens never embed roles or permissions.
- Deactivated or suspended users fail bearer authentication on the next protected request, even if the access token itself has not expired.
