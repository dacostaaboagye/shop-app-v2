# ADR 0006: Browser Sessions Use Bearer Access Tokens And Cookie Refresh Tokens

## Status

Accepted

## Context

`E-01-01` requires JWT-based authentication, refresh-token support, lockout handling, and immediate access revocation. The workbook also forbids embedding roles or permissions in JWT payloads, which means authorization must always be resolved server-side.

The main interactive client in this repository is the browser application in `apps/web`. That makes long-lived browser credentials the highest-risk part of the design.

## Decision

- Access tokens are short-lived bearer tokens returned in the JSON response body.
- Refresh tokens are long-lived opaque secrets delivered only through an `HttpOnly` cookie.
- The server persists only hashed refresh-token values.
- Refresh requests rotate the previous refresh token and revoke the replaced server record.
- Logout revokes the active refresh-token record and clears the cookie.
- Protected routes trust the bearer token only for identity bootstrap, then reload the backing user record on every request and reject suspended or deactivated accounts immediately.
- JWT payloads are limited to identity and expiry fields and never carry roles or permissions.

## Consequences

- Browser XSS has a smaller blast radius because the long-lived refresh credential is not readable through application JavaScript.
- The API and web app must use credentialed CORS correctly for refresh and logout flows.
- CSRF risk is constrained by using the cookie only for auth refresh/logout endpoints instead of using cookies for all authenticated API traffic.
- Permission revocation remains a server-side concern and does not depend on token contents becoming stale.
