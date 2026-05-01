# Security and Auth Audit

Audited: 2026-05-01
Branch at audit time: `fix/ops-testing-seed-admin`
Status: Findings recorded; remediation pending

## What Was Audited

- `apps/api/src/modules/auth` (authentication, OAuth, sessions, password reset, email verification, super-admin seed)
- `apps/api/src/modules/access-control` and the `config.access` decorator across module routes
- A representative sample of route handlers across `admin`, `assignments`, `catalog`, `manager`, `messaging`, `sales`, `stock`, `official-documents`
- `apps/api/src/server` (Fastify bootstrap, CORS, helmet, rate limiting, error handling)
- `apps/api/src/env.ts` and `.env.example`, `.env.local`
- `apps/api/scripts/seed-admin.ts` and `apps/api/scripts/lib/super-admin-seed-support.ts`
- `apps/web` auth surface: `lib/auth/*`, `store/use-auth-session-store.ts`, `components/system/portal-guard.tsx`, `components/providers/auth-session-bootstrap.tsx`, `next.config.mjs`, `env.ts`
- `packages/contracts` request/response schemas
- `packages/database` schema and Drizzle usage patterns
- Deployment surface: `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`, `apps/api/fly.*.toml`, `railway.json`, repo-root log files

## Severity Legend

- CRITICAL: direct path to account takeover, data loss, or credential exposure. Fix before next deploy.
- HIGH: real exploit path under realistic preconditions. Fix this sprint.
- MEDIUM: defense-in-depth gap or deviation from a stated invariant. Fix soon.
- LOW: hygiene / hardening. Schedule.
- INFO: documented behavior worth knowing.

---

## Critical

### C1. OAuth silently links to existing email accounts

**File:** `apps/api/src/modules/auth/google-oauth.service.ts:185-232` (`findOrCreateUser`)

If `victim@example.com` exists as a password account and a Google OAuth flow returns the same email, the service auto-links the Google identity to that account without any verification. Pre-account-takeover attack: an attacker registers a target's email with a password they control, then the real owner signs in with Google and is silently redirected into the attacker's account.

**Fix direction:** Require explicit linking. If email matches but no OAuth identity exists, force a password challenge (or send a confirmation email) before linking.

### C2. Real credentials present in `.env.local` on disk

**File:** `D:/work/personal/shop-app/shop-app-v2/.env.local`

Contains live Neon DATABASE_URL with credentials, Cloudflare R2 access key + secret, Google OAuth client secret, and a Resend API key. Gitignored, so not in history — but workstation access, log-snapshots, or backup tooling can extract them.

**Fix direction:** Rotate all four credential sets. Move secrets to a vault / per-environment store; load via direnv or platform secret injection. Audit `dev-*.log` files in repo root before discarding.

### C3. CORS falls open when `WEB_BASE_URL` is unset

**File:** `apps/api/src/server/create-server.ts:94-104`

```ts
origin(origin, callback) {
  if (!origin || !env.webBaseUrl) {
    callback(null, true);
    return;
  }
  callback(null, origin === env.webBaseUrl);
},
```

Missing `WEB_BASE_URL` in any deployed environment turns CORS into "allow any origin with credentials," which combined with the cookie-based refresh flow is a CSRF vector.

**Fix direction:** Treat missing `WEB_BASE_URL` as a fatal startup error in non-development modes. Default deny.

---

## High

### H1. CSP fully disabled; no security headers from the web app either

**Files:** `apps/api/src/server/create-server.ts:105-108`, `apps/web/next.config.mjs:1-24`

API helmet has `contentSecurityPolicy: false` (the embed reasoning is unnecessary for a JSON API). Web app sets no `headers()` — no CSP, no `X-Frame-Options`, no `Referrer-Policy`, no `X-Content-Type-Options`. No defense-in-depth against XSS or clickjacking.

**Fix direction:** Add a strict CSP to `next.config.mjs` for the web app (`default-src 'self'; frame-ancestors 'none'; …`). Re-enable a minimal CSP for the API (`default-src 'none'; frame-ancestors 'none'`).

### H2. JWT timestamps stored as milliseconds, not seconds

**File:** `apps/api/src/modules/auth/access-token.ts:41-48, 94-101`

`issued_at` / `expires_at` are minted in ms; on verify the code multiplies by 1000 again when reconstructing a Date. Internally consistent but RFC 7519 non-compliant; any external validator (gateway, log aggregator) misreads expiry, and the expiry returned to clients is 1000× wrong.

**Fix direction:** Standardize on seconds (NumericDate). Remove the double-scale on verify.

### H3. Manager staff endpoint trusts client `locationId`

**File:** `apps/api/src/modules/assignments/manager-staff.routes.ts:18, 31-36`

Declares `scope: "contextual"` but passes `query.locationId` straight to the repository with no check that the requesting user has access to that location. A manager of location A reads location B's staff by passing B's id.

**Fix direction:** Mirror `apps/api/src/modules/stock/stock-balance-location.routes.ts:46-51` — `assertLocationPermission(actor, locationId, permission)`.

### H4. `any_active`-scoped routes accept arbitrary client `locationId`

**Files:**
- `apps/api/src/modules/stock/supply-request-route-support.ts:205`
- `apps/api/src/modules/assignments/stock-assignment-route-support.ts:173`
- `apps/api/src/modules/manager/manager-dashboard.routes.ts`

Same shape as H3 but spread across the `any_active` scope family. Either confirm the scope grants global location access (and rename it) or add a follow-up check that the supplied `locationId` is in the user's active set.

### H5. Profile-media MIME validation is prefix-only

**File:** `apps/api/src/modules/auth/account-profile-media.service.ts:66-72`

Accepts any `image/*`. Includes `image/svg+xml`, which executes JS when rendered inline — stored XSS if media is ever rendered same-origin.

**Fix direction:** Allowlist exact types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`); reject SVG. Verify magic bytes server-side.

### H6. Client-side-only auth gate in `AuthGuard`

**File:** `apps/web/src/components/system/portal-guard.tsx:26-99`

Auth check runs in `useEffect` after first render. Protected pages render briefly before redirect. Risk: flash of admin UI, race-condition data fetches.

**Fix direction:** Add `apps/web/src/middleware.ts` to redirect at the edge before render. Component guard becomes belt-and-braces.

### H7. Super-admin password printed to stdout

**File:** `apps/api/scripts/seed-admin.ts:112-116`

Anyone with read access to CI logs can recover the bootstrap admin password. `requires_password_change = true` is set, but a logged-in attacker still wins.

**Fix direction:** Print only email, slug, and "Password: (from env)". Or generate a one-time setup link and print only that.

---

## Medium

### M1. Failed-login audit row leaks user-existence bit

**File:** `apps/api/src/modules/auth/authentication.service.ts:76-114`

Generic 401 to client (good), but the `auth_events` row records `userId` only on the wrong-password path. An operator reading audit logs can enumerate which login attempts hit real accounts.

**Fix direction:** Pick one — always omit `userId` for failed attempts, or always best-effort include it. Be consistent.

### M2. SSRF via PDF logo fetch

**File:** `apps/api/src/modules/official-documents/official-document-pdf-layout.ts:118-162`

Validates http(s) and content-length but does not block private/loopback IPs. An admin who can set `logoImageUrl` can probe internal services from the API host (`169.254.169.254`, `10.x`, etc.).

**Fix direction:** Resolve hostname pre-fetch and reject RFC 1918, link-local, loopback, metadata IPs. Or pin uploads through R2 only.

### M3. CSRF defended only by `SameSite=Strict` + CORS

**Files:** `apps/api/src/modules/auth/refresh-token-cookie.ts:13-19`, `apps/web/src/lib/auth/auth-client.ts:140`

Refresh cookie is `SameSite=Strict, HttpOnly, Secure-in-prod`; access token sent as `Authorization: Bearer …`. With C3 fixed this is acceptable. Make the assumption explicit so it isn't accidentally regressed by a future cookie-authed endpoint.

**Fix direction:** Comment in cookie module documenting the chain. Add a smoke test that fails if `SameSite` regresses or a new state-changing endpoint reads auth from cookies.

### M4. Swagger UI renders backend-supplied OpenAPI spec without CSP

**File:** `apps/web/src/components/admin/access/internal-api-docs-page-client.tsx:64, 82, 158`

Swagger UI sanitizes spec content, but with H1 unfixed there is no defense-in-depth. Drops to LOW once H1 is shipped.

### M5. No global rate limit

**File:** `apps/api/src/server/create-server.ts:110-112` (`global: false`)

Auth routes have explicit limits (good). Everything else — including expensive list/report endpoints — is unbounded.

**Fix direction:** Add a coarse global limit (e.g., 600/min/IP) as a backstop on top of per-route limits.

### M6. Fastify `bodyLimit` not configured explicitly

**File:** `apps/api/src/server/create-server.ts:87-91`

Default ~1MB is fine for JSON, but make it explicit globally and per route where it differs.

### M7. Console-logging full error objects in fire-and-forget paths

**Files:** `apps/api/src/modules/auth/registration.service.ts:78`, `apps/api/src/modules/auth/password-reset.service.ts:74`, `apps/api/src/modules/messaging/email-send-execution.ts:26-29`

Full Error objects logged with `console.error`. SMTP/Resend errors include request IDs and sometimes the bearer token. Use the request logger with explicit fields.

### M8. Pino logger has no `redact` paths

**File:** `apps/api/src/server/create-server.ts:87-91`

Auto-logged requests leak `Authorization`, `Cookie`, `Set-Cookie` headers in cleartext.

**Fix direction:** Configure `logger.redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]']`.

### M9. `NEXT_PUBLIC_API_BASE_URL` fallback in `apps/web/src/env.ts`

**File:** `apps/web/src/env.ts:1-17`

If `API_BASE_URL` is forgotten in deployment, the API URL is shipped to the browser bundle. Weakens the rewrite-proxy story documented in `docs/engineering/testing-environment-deployment.md`.

**Fix direction:** Make `API_BASE_URL` mandatory at build time for production builds.

### M10. No "logout from all devices" / no concurrent-session cap

**File:** `apps/api/src/modules/auth/session.service.ts`

Password reset already revokes all refresh tokens (good). No user-facing endpoint to revoke other sessions; no cap on issued tokens. Incident-response gap, not a vulnerability.

### M11. Ad-hoc admin check breaks the CASL pattern

**File:** `apps/api/src/modules/stock/supply-request-access-policy.ts:214-223`

`isAdmin()` resolves permissions and tests `admin.dashboard.view` to gate force-cancel. Future grants of that permission silently change who can force-cancel supply requests.

**Fix direction:** Add explicit permissions like `stock.supply.request.force.cancel` and use those.

---

## Low

- **L1.** Refresh-token cookie has no explicit `Domain` (`apps/api/src/modules/auth/refresh-token-cookie.ts:4-19`). Document the same-site assumption.
- **L2.** OAuth error redirect — verify the receiver renders `oauthError` as text only. `apps/web/src/app/auth/callback/auth-callback-page-client.tsx`.
- **L3.** Active-location slug persisted to localStorage. `apps/web/src/store/use-active-location-store.ts:48-62`. Non-sensitive.
- **L4.** `docker-compose.yml` uses `postgres/postgres` defaults — local dev only.
- **L5.** Swagger bundle loaded without SRI. Local origin so risk is low.
- **L6.** Error messages echo client-controllable slugs (`apps/api/src/modules/catalog/catalog-admin-write.routes.ts:64`).
- **L7.** No MFA / 2FA. Roadmap, not a current bug.

---

## Things Done Right (don't regress)

- Bcryptjs at cost 12 (`apps/api/src/modules/auth/password-hash.ts:3`).
- Refresh tokens hashed at rest, rotated on every refresh, full revocation audit (`session.service.ts:127-180`).
- Logout revokes server-side, not just clears the cookie.
- Account lockout: 5 attempts / 15 min rolling, 15 min lockout (`packages/domain/src/auth/lockout-policy.ts:12-16`).
- Email verification and password reset: 32-byte tokens, hashed in DB, single-use, time-bound, transactional.
- Google OAuth uses PKCE (S256) + state, both in HttpOnly cookies with 10-minute TTL (`google-oauth.service.ts:62-88`); requires `email_verified=true` from provider.
- Drizzle-only data layer; no `$queryRawUnsafe` anywhere; no operator-injection surface from spread bodies.
- All routes validate via Zod contracts; no `.passthrough()` / `z.any()` on request bodies.
- Access token comparison via `timingSafeEqual` (`access-token.ts:124`).
- Generic `invalidCredentialsError()` blocks user enumeration via the response.
- Open-redirect protection on `next` param (`auth-redirect.ts:25-35`).
- Access token kept in memory (Zustand, no persist plugin), not localStorage.
- Webhook signature verification via Resend's official `webhooks.verify()`.
- Dockerfiles drop to non-root; multi-stage builds; no `.env` baked in.
- HTTPS handled at Fly edge; cookies `Secure` outside development.
- DTO serialization filters sensitive fields via Zod schemas (`current-user.service.ts:84-102`).

---

## Recommended Remediation Order

1. **C1, C2, C3** — same day.
2. **H1, H6, H7** — this sprint.
3. **H2, H3/H4, H5** — next.
4. **M1–M11** in priority order. Quickest wins: M5 (global rate limit), M8 (logger redact).
5. **L1–L7** opportunistically.

Every fix lands as a separate PR scoped to one finding, on `fix/ops-…` or a backlog ticket where one applies, with tests demonstrating the regression and the fix.
