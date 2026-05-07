# Security Threat Model

Reviewed: 2026-05-05
Status: Active working model for security hardening

This threat model consolidates the exploit paths that matter most for Shop App V2. It complements `docs/engineering/security-and-auth-audit.md` and `docs/engineering/uploads-notifications-email-evaluation.md`; those older audits remain useful, but several findings listed there have already been fixed on `dev`.

## Security Objective

Protect inventory, financial documents, operational evidence, user identities, and stakeholder trust. The system must assume attackers can call APIs directly, guess public references, upload malicious files, replay requests, and attempt to abuse stale sessions or permissions.

## Assets

- User accounts, refresh tokens, OAuth identities, password reset and email verification tokens.
- Roles, permission history, location assignments, and immediate revocation state.
- Stock balances, reservations, stock counts, stock-take sessions, supply requests, transfers, GTNs, invoices, and document snapshots.
- Catalog media, profile media, imported CSV/XLSX files, printable stock booklets, and generated documents.
- Notification and email content, webhook payloads, provider event records, and operational logs.
- Environment secrets for database, R2, Google OAuth, Resend, and deployment platforms.

## Trust Boundaries

- Browser to Next.js web app and API proxy.
- API boundary, where authentication, authorization, validation, rate limiting, and structured errors must be enforced.
- API to PostgreSQL, R2, Google OAuth, Resend, and platform event workers.
- Direct-to-R2 uploads, where the client can control file name, declared MIME type, and attempted content.
- Public-looking references such as slugs, GTN numbers, invoice references, and stock-take references.
- Operator logs, CI logs, local `.env.local`, and deployment secrets.

## Priority Exploit Paths

| Priority | Exploit path | Impact | Current status | Mitigation path |
| --- | --- | --- | --- | --- |
| P0 | Stale or stolen refresh/session credentials after role, location, or user status changes | Account takeover or continued access after revocation | Logout-all, password reset, and permission revocation paths set a user-level session cutoff and revoke active refresh tokens; bearer auth and refresh reject tokens issued at or before the cutoff | Add session inventory UI and tests for permission revocation on active sessions |
| P0 | Server-side authorization gap on admin/manager/worker routes or location-scoped resources | Cross-location stock/document access | Route access guard exists; targeted route audits still required | Continue per-domain authorization tests for stock takes, GTNs, invoices, transfers, and assignments |
| P0 | Public self-registration or OAuth into the operations identity store | Anonymous user creation or external-provider entry inside the workforce auth boundary, increasing future role-escalation and lifecycle-abuse risk | Mitigated for the operations portal by ADR 0021, API/UI registration/OAuth blocking, and the protected internal staff-provisioning API | Add the staff-provisioning UI/setup-email follow-up and keep future ecommerce registration/OAuth under customer-owned route namespaces on the shared backend |
| P0 | Predictable references used as access keys | Unauthorized document/session download | Public refs are required UX, but must never replace authorization. Sales/GTN issued-document refs and stock-take download/detail refs now have regression coverage. | Continue adding guessed-reference tests as new public-reference endpoints are introduced |
| P1 | Malicious imports or uploads | Stored XSS, formula injection, bad stock data, partial writes | Catalog/profile media MIME hardening exists; imports need continuing review | Keep exact MIME allowlists, magic-byte checks, transaction tests, and formula neutralization |
| P1 | Replay or double-apply of stock-taking and stock-adjustment workflows | Inventory corruption | Some lifecycle tests exist; keep expanding | Enforce idempotent apply transitions and append-only adjustment evidence |
| P1 | Missing or weak rate limits on expensive endpoints | Brute force, scraping, quota exhaustion, DoS | Auth, outbound email, imports, generated reports/downloads, official document downloads, and webhooks have endpoint-specific limits plus the global backstop | Add endpoint-specific limits when introducing future expensive endpoints |
| P1 | Log/error leakage of secrets, cookies, OAuth codes, PII, or document contents | Credential theft and privacy breach | API logger redaction exists; body-content logging still needs review | Keep redaction tests and remove body/full-error logging in async paths |
| P1 | Webhook replay or forged provider events | False delivery state, suppression, or event pollution | Resend signature verification exists; timestamp window must remain explicit | Test timestamp window, malformed payload handling, and idempotency |
| P2 | SSRF via externally fetched branding/media URLs | Internal service probing from API host | PDF logo fetches reject IANA special-purpose targets, pin the validated address, do not follow redirects, enforce byte/size checks, and apply a wall-clock deadline | Prefer R2-uploaded assets and keep network-target tests for document media fetchers |
| P2 | Client-side-only trust in role, location, quantity, price, or hidden fields | Unauthorized or invalid writes | Backend validation exists by pattern; continue route-specific tests | Never trust UI state; validate actor, scope, and business invariants server-side |

## Current Mitigation Batch

1. Add a global API rate-limit backstop while preserving problem-details errors.
2. Keep the existing API/web CSP, CORS fail-closed behavior, and logger redaction documented as non-regression requirements.
3. Enforce route-level `config.rateLimit` settings with structured problem-details responses.
4. Add endpoint-specific outbound-send limits for admin test emails, admin communications, supplier portal invites, and sales document email sends.
5. Reject IANA special-purpose targets before fetching official-document PDF logo images; pin the validated address, do not follow redirects, validate image bytes, enforce size limits, and stop slow-drip responses with a wall-clock deadline.
6. Disable public operations self-registration and Google OAuth, then document the operations/customer auth boundary in ADR 0021.
7. Add the protected internal staff-provisioning API so workforce users are created by authorized access managers with explicit role/location assignment and password setup required before first sign-in.
8. Add follow-up tickets for webhook timestamp replay checks, stock workflow idempotency tests, guessed-reference authorization tests for future public-reference endpoints, staff-provisioning UI/setup email, and endpoint-specific limits for future expensive routes.

## Current Internal Provisioning Regression Evidence

- `apps/api/test/admin-staff-provisioning.routes.test.ts` verifies `POST /api/admin/access/users` creates an internal workforce account through the protected admin access route without exposing raw internal IDs.
- `apps/api/test/admin-staff-provisioning.service.test.ts` verifies email/name normalization, password setup required for newly created users, scoped role validation, duplicate-email handling, slug-conflict retry, `access.user.created` audit event publication, and non-blocking sanitized logging if event append fails after the transactional user write.
- `packages/contracts/src/admin-user-access.test.ts` verifies the staff-provisioning request and response contracts accept role/location slugs and reject raw internal IDs at the public DTO boundary.

## Current Authorization Regression Evidence

- `apps/api/test/issued-document-public-reference-auth.routes.test.ts` verifies guessed sales and GTN document references still delegate to the issued-document services and return `403` when service authorization denies access.
- `apps/api/test/gtn-issued-document-snapshot.service.test.ts` verifies GTN snapshot access rejects actors without requester, source-location, destination-location, or admin permission, while allowing a source-location manager.
- Existing stock-take route tests cover manager location-scope enforcement for generated stock-take detail, sheet, booklet PDF, workbook, variance report, dry-run import, and apply routes.

## Current Rate-Limit Regression Evidence

- `apps/api/test/catalog-import.routes.test.ts` verifies product import uploads are route-limited before another CSV is parsed and records dedicated upload/report limits.
- `apps/api/test/catalog-reference-import.routes.test.ts` verifies brand/category reference import uploads are route-limited before more rows are imported.
- `apps/api/test/stock-take-rate-limit.routes.test.ts` verifies stock-take generation, import dry-run, and generated CSV downloads stop before additional service execution.
- `apps/api/test/stock-take-pdf.routes.test.ts` and `apps/api/test/stock-take-xlsx.routes.test.ts` record dedicated limits for generated PDF and workbook downloads.
- `apps/api/test/issued-document.routes.test.ts` verifies official document PDF downloads are route-limited before additional PDF rendering.
- `apps/api/test/email-webhook.routes.test.ts` verifies Resend webhook bursts are route-limited before invoking webhook processing.

## Non-Regression Requirements

- Backend authorization must remain server-enforced; hiding UI actions is not access control.
- Public DTOs must not expose raw internal surrogate IDs unless explicitly approved.
- Refresh tokens stay HttpOnly, `SameSite=Strict`, scoped to `/api/auth`, hashed at rest, and rotated.
- OAuth state and PKCE verifier stay HttpOnly and time-limited.
- CORS must not echo arbitrary browser origins outside development.
- API and web CSP must stay enabled.
- Logs must redact auth-bearing headers and must not include secrets, OAuth codes, email bodies, document bodies, or raw provider tokens.
- Upload and import flows must validate declared metadata against stored content before creating durable records.
