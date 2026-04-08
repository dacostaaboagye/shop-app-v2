# Auth API Reference

Backlog ticket: `E-01-01`

## Session model

- Access tokens are returned in the JSON response body.
- Refresh tokens are issued only as the `shop_refresh_token` HTTP-only cookie.
- Refresh and logout requests depend on that cookie and do not accept refresh tokens in the request body.
- Protected routes authenticate the bearer access token and re-check user status on every request.

## `POST /api/auth/register`

Creates an active user account, assigns the default `basic_user` role, issues an access token, and sets the refresh-token cookie.

Request body:

```json
{
  "firstName": "Store",
  "lastName": "Manager",
  "email": "manager@example.com",
  "password": "Password123!"
}
```

Success response:

```json
{
  "accessToken": "<jwt>",
  "accessTokenExpiresAt": "2026-04-08T13:00:00.000Z",
  "user": {
    "slug": "store-manager-ab12",
    "firstName": "Store",
    "lastName": "Manager",
    "email": "manager@example.com",
    "status": "active",
    "preferredPortal": null,
    "lastLoginAt": null,
    "requiresPasswordChange": false
  }
}
```

Failure responses:

- `409 conflict`: email already registered or slug allocation exhausted
- `503 internal_error`: auth runtime misconfigured

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
