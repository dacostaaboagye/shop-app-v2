# Security and Auth Audit

Audited: 2026-05-01
Branch at audit time: `fix/ops-testing-seed-admin`
Status: Remediation largely shipped. Statuses verified against code + git
history on 2026-07-11. Remaining open: C2 (credential rotation + local log
purge) and L-tier items.

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

### C1. OAuth silently links to existing email accounts — CLOSED ([PR #38](https://github.com/dacostaaboagye/shop-app-v2/pull/38))

**File (at audit time):** `apps/api/src/modules/auth/google-oauth.service.ts:185-232` (`findOrCreateUser`)

If `victim@example.com` exists as a password account and a Google OAuth flow returns the same email, the service auto-links the Google identity to that account without any verification. Pre-account-takeover attack: an attacker registers a target's email with a password they control, then the real owner signs in with Google and is silently redirected into the attacker's account.

**Fix shipped:** the find-or-create branch moved to `apps/api/src/modules/auth/google-oauth-user-resolver.ts`. When email matches but no OAuth identity exists, the resolver throws a 409 `AppError` with `details.oauthError = "account_exists"`. The OAuth callback handler catches this and redirects the browser to `/login?oauth_error=account_exists` so the user signs in with their existing credentials. Linking Google from an authenticated session is the future feature path. Operations OAuth was additionally disabled entirely by [PR #132](https://github.com/dacostaaboagye/shop-app-v2/pull/132) as a defence-in-depth layer.

### C2. Real credentials present in `.env.local` on disk

**File:** `D:/work/personal/shop-app/shop-app-v2/.env.local`

Contains live Neon DATABASE_URL with credentials, Cloudflare R2 access key + secret, Google OAuth client secret, and a Resend API key. Gitignored, so not in history — but workstation access, log-snapshots, or backup tooling can extract them.

**Fix direction:** Rotate all four credential sets. Move secrets to a vault / per-environment store; load via direnv or platform secret injection. Audit `dev-*.log` files in repo root before discarding.

**Architecture update (2026-05-07):** ADR 0022 and
`docs/engineering/secrets-management.md` define vendor-neutral secret delivery
with Infisical as the initial vault. Application code remains bound to canonical
environment names, not to an Infisical SDK. Credential rotation is still
required before closing C2.

**Status (2026-07-11): PARTIALLY CLOSED.** `.env.local` no longer exists on
disk and Infisical is the secret source. Still outstanding: (1) confirm the
four credential sets (Neon, R2, Google OAuth, Resend) were actually rotated;
(2) `dev-*.log` / `tmp-api-*.log` files in the repo root predate log redaction
and must be audited and deleted. Tracked in
`docs/engineering/production-readiness-plan.md`.

### C3. CORS falls open when `WEB_BASE_URL` is unset — CLOSED (PR #36)

**Status (2026-07-11):** `create-server.ts` now rejects any browser origin that
does not match `WEB_BASE_URL`; the allow-all branch is reachable only in
development, and `WEB_BASE_URL` is required at boot outside development.

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

### H1. CSP fully disabled; no security headers from the web app either — CLOSED (PR #39)

**Status (2026-07-11):** API helmet ships `default-src 'none'` CSP; web
`next.config.mjs` ships full CSP + Referrer-Policy + X-Content-Type-Options +
X-Frame-Options + Permissions-Policy on every route.

**Files:** `apps/api/src/server/create-server.ts:105-108`, `apps/web/next.config.mjs:1-24`

API helmet has `contentSecurityPolicy: false` (the embed reasoning is unnecessary for a JSON API). Web app sets no `headers()` — no CSP, no `X-Frame-Options`, no `Referrer-Policy`, no `X-Content-Type-Options`. No defense-in-depth against XSS or clickjacking.

**Fix direction:** Add a strict CSP to `next.config.mjs` for the web app (`default-src 'self'; frame-ancestors 'none'; …`). Re-enable a minimal CSP for the API (`default-src 'none'; frame-ancestors 'none'`).

### H2. JWT timestamps stored as milliseconds, not seconds — CLOSED (PR #41)

**File:** `apps/api/src/modules/auth/access-token.ts:41-48, 94-101`

`issued_at` / `expires_at` are minted in ms; on verify the code multiplies by 1000 again when reconstructing a Date. Internally consistent but RFC 7519 non-compliant; any external validator (gateway, log aggregator) misreads expiry, and the expiry returned to clients is 1000× wrong.

**Fix direction:** Standardize on seconds (NumericDate). Remove the double-scale on verify.

### H3. Manager staff endpoint — RETRACTED on review (2026-05-01)

**File:** `apps/api/src/modules/assignments/manager-staff.routes.ts:18, 31-36`

The original audit flagged this as a missing per-location check. On closer reading of `apps/api/src/modules/access-control/permission-resolution.service.ts:34-55` and `apps/api/src/modules/access-control/request-location-scope.ts`, the route's `scope: "contextual"` already pins the middleware-level `assertHasPermission` call to the `locationId` taken from the query (or the `x-location-id` header). `resolvePermissions({ locationId })` then filters role + override rows for that specific location, so a manager scoped to location A who passes `query.locationId=B` is correctly rejected by the middleware before the handler runs.

No code change required for H3. **The H4 finding below remains valid** — `any_active` scope resolution does not pin to the supplied `locationId`, which is the real bug. PR #42 fixes the `any_active` family. A clarifying comment was added to the manager-staff handler so future readers don't reopen this finding.

### H4. `any_active`-scoped routes accept arbitrary client `locationId` — CLOSED (PR #42)

**Files:**
- `apps/api/src/modules/stock/supply-request-route-support.ts:205`
- `apps/api/src/modules/assignments/stock-assignment-route-support.ts:173`
- `apps/api/src/modules/manager/manager-dashboard.routes.ts`

Same shape as H3 but spread across the `any_active` scope family. Either confirm the scope grants global location access (and rename it) or add a follow-up check that the supplied `locationId` is in the user's active set.

### H5. Profile-media MIME validation is prefix-only — CLOSED (PRs #43, #48, #50, #61)

**Status (2026-07-11):** exact-type allowlist (SVG rejected), AVIF added to
match the web picker, MIME re-validated on confirm, magic-byte + size
verification at upload confirm.

**File:** `apps/api/src/modules/auth/account-profile-media.service.ts:66-72`

Accepts any `image/*`. Includes `image/svg+xml`, which executes JS when rendered inline — stored XSS if media is ever rendered same-origin.

**Fix direction:** Allowlist exact types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`); reject SVG. Verify magic bytes server-side.

### H6. Client-side-only auth gate in `AuthGuard` — CLOSED (PRs #40, #58)

**Status (2026-07-11):** edge redirect ships as `apps/web/src/proxy.ts`
(Next.js 16 rename of middleware.ts); component guard remains belt-and-braces.

**File:** `apps/web/src/components/system/portal-guard.tsx:26-99`

Auth check runs in `useEffect` after first render. Protected pages render briefly before redirect. Risk: flash of admin UI, race-condition data fetches.

**Fix direction:** Add `apps/web/src/middleware.ts` to redirect at the edge before render. Component guard becomes belt-and-braces.

### H7. Super-admin password printed to stdout — CLOSED (PR #37)

**File:** `apps/api/scripts/seed-admin.ts:112-116`

Anyone with read access to CI logs can recover the bootstrap admin password. `requires_password_change = true` is set, but a logged-in attacker still wins.

**Fix direction:** Print only email, slug, and "Password: (from env)". Or generate a one-time setup link and print only that.

---

## Medium

### M1. Failed-login audit row leaks user-existence bit — CLOSED (PR #59)

**File:** `apps/api/src/modules/auth/authentication.service.ts:76-114`

Generic 401 to client (good), but the `auth_events` row records `userId` only on the wrong-password path. An operator reading audit logs can enumerate which login attempts hit real accounts.

**Fix direction:** Pick one — always omit `userId` for failed attempts, or always best-effort include it. Be consistent.

### M2. SSRF via PDF logo fetch — CLOSED (verified 2026-07-11)

**Status:** `official-document-logo-network-policy.ts` resolves the hostname
and rejects private, loopback, link-local, and reserved IPv4/IPv6 ranges.

**File:** `apps/api/src/modules/official-documents/official-document-pdf-layout.ts:118-162`

Validates http(s) and content-length but does not block private/loopback IPs. An admin who can set `logoImageUrl` can probe internal services from the API host (`169.254.169.254`, `10.x`, etc.).

**Fix direction:** Resolve hostname pre-fetch and reject RFC 1918, link-local, loopback, metadata IPs. Or pin uploads through R2 only.

### M3. CSRF defended only by `SameSite=Strict` + CORS — CLOSED (2026-07-11)

**Status:** C3 is fixed, the CSRF chain is documented in
`refresh-token-cookie.ts`, and `apps/api/test/auth.refresh-cookie.test.ts`
fails if `SameSite=Strict`, `HttpOnly`, or the cookie paths regress.

**Files:** `apps/api/src/modules/auth/refresh-token-cookie.ts:13-19`, `apps/web/src/lib/auth/auth-client.ts:140`

Refresh cookie is `SameSite=Strict, HttpOnly, Secure-in-prod`; access token sent as `Authorization: Bearer …`. With C3 fixed this is acceptable. Make the assumption explicit so it isn't accidentally regressed by a future cookie-authed endpoint.

**Fix direction:** Comment in cookie module documenting the chain. Add a smoke test that fails if `SameSite` regresses or a new state-changing endpoint reads auth from cookies.

### M4. Swagger UI renders backend-supplied OpenAPI spec without CSP — DOWNGRADED TO LOW

**Status (2026-07-11):** H1 shipped (PR #39), so this drops to LOW as the
finding itself predicted.

**File:** `apps/web/src/components/admin/access/internal-api-docs-page-client.tsx:64, 82, 158`

Swagger UI sanitizes spec content, but with H1 unfixed there is no defense-in-depth. Drops to LOW once H1 is shipped.

### M5. No global rate limit — CLOSED (PRs #126, #131)

**Status (2026-07-11):** global backstop of 600 req/min registered in
`create-server.ts` on top of per-route limits; expensive endpoints got explicit
limits in PR #131.

**File:** `apps/api/src/server/create-server.ts:110-112` (`global: false`)

Auth routes have explicit limits (good). Everything else — including expensive list/report endpoints — is unbounded.

**Fix direction:** Add a coarse global limit (e.g., 600/min/IP) as a backstop on top of per-route limits.

### M6. Fastify `bodyLimit` not configured explicitly — CLOSED (2026-07-11)

**Status:** global 1 MiB `bodyLimit` pinned in `create-server.ts`; stock-take
import routes keep their larger per-route override.

**File:** `apps/api/src/server/create-server.ts:87-91`

Default ~1MB is fine for JSON, but make it explicit globally and per route where it differs.

### M7. Console-logging full error objects in fire-and-forget paths — CLOSED (verified 2026-07-11)

**Status:** remaining `console.error` call sites log explicit fields and
`error.message` only, never full Error objects.

**Files:** `apps/api/src/modules/auth/registration.service.ts:78`, `apps/api/src/modules/auth/password-reset.service.ts:74`, `apps/api/src/modules/messaging/email-send-execution.ts:26-29`

Full Error objects logged with `console.error`. SMTP/Resend errors include request IDs and sometimes the bearer token. Use the request logger with explicit fields.

### M8. Pino logger has no `redact` paths — CLOSED (PR #47)

**File:** `apps/api/src/server/create-server.ts:87-91`

Auto-logged requests leak `Authorization`, `Cookie`, `Set-Cookie` headers in cleartext.

**Fix direction:** Configure `logger.redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]']`.

### M9. `NEXT_PUBLIC_API_BASE_URL` fallback in `apps/web/src/env.ts` — CLOSED (verified 2026-07-11)

**Status:** `next.config.mjs` throws at build time on Vercel deploys when
`API_BASE_URL` is missing, so a production deploy can no longer silently fall
back to shipping the API URL in the browser bundle.

**File:** `apps/web/src/env.ts:1-17`

If `API_BASE_URL` is forgotten in deployment, the API URL is shipped to the browser bundle. Weakens the rewrite-proxy story documented in `docs/engineering/testing-environment-deployment.md`.

**Fix direction:** Make `API_BASE_URL` mandatory at build time for production builds.

### M10. No "logout from all devices" / no concurrent-session cap

**File:** `apps/api/src/modules/auth/session.service.ts`

Password reset already revokes all refresh tokens (good). No user-facing endpoint to revoke other sessions; no cap on issued tokens. Incident-response gap, not a vulnerability.

**Status update (2026-05-06):** `POST /api/auth/logout-all` now revokes
every active refresh token for the authenticated user and clears the current
browser cookies. The implementation also records a user-level session cutoff so
access and refresh tokens issued at or before logout-all are rejected even if an
in-flight refresh attempt races with the bulk revocation. Session inventory
remains a future UX/operations enhancement.

### M11. Ad-hoc admin check breaks the CASL pattern — CLOSED (PR #65)

**File:** `apps/api/src/modules/stock/supply-request-access-policy.ts:214-223`

`isAdmin()` resolves permissions and tests `admin.dashboard.view` to gate force-cancel. Future grants of that permission silently change who can force-cancel supply requests.

**Fix direction:** Add explicit permissions like `stock.supply.request.force.cancel` and use those.

---

## Low

- **L1.** Refresh-token cookie has no explicit `Domain` (`apps/api/src/modules/auth/refresh-token-cookie.ts:4-19`). Document the same-site assumption.
- **L2.** OAuth error redirect — superseded for the operations portal by ADR
  0021. Operations OAuth routes are blocked and `/auth/callback` redirects to
  sign-in; future ecommerce OAuth must add its own customer-owned callback
  review.
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

> Superseded 2026-07-11: everything below shipped except the C2 residual
> (credential rotation + local log purge) and L-tier items. Open work is
> tracked in `docs/engineering/production-readiness-plan.md`.

1. **C1, C2, C3** — same day.
2. **H1, H6, H7** — this sprint.
3. **H2, H3/H4, H5** — next.
4. **M1–M11** in priority order. Quickest wins: M5 (global rate limit), M8 (logger redact).
5. **L1–L7** opportunistically.

Every fix lands as a separate PR scoped to one finding, on `fix/ops-…` or a backlog ticket where one applies, with tests demonstrating the regression and the fix.
