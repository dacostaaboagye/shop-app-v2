# File Uploads, Notifications, and Email Evaluation

Audited: 2026-05-01
Scope: file upload pipeline, notification system, email system (follow-up to the 2026-04-24 email audit)
Status: Findings recorded; remediation pending

## What Was Audited

- Upload backend: `apps/api/src/infrastructure/r2-storage.ts`, `apps/api/src/modules/auth/account-profile-media.*`, `apps/api/src/modules/catalog/catalog-media.*`, `apps/api/src/modules/catalog/postgres-catalog-media.repository.ts`
- Upload frontend: `apps/web/src/components/admin/catalog/media/*`, `apps/web/src/components/system/account-profile-image-panel.tsx`, `apps/web/src/components/system/preview-image.tsx`
- Notification backend: `apps/api/src/modules/notifications`, `apps/api/src/modules/events`, `packages/database/src/schema/infrastructure.ts`, `packages/contracts/src/notifications.ts`
- Notification frontend: `apps/web/src/components/system/notification-*`, `apps/web/src/components/providers/notification-live-provider.tsx`, `apps/web/src/components/system/portal-topbar.tsx`
- Email backend (follow-up): `apps/api/src/modules/messaging/*`, `packages/database/src/schema/email-delivery.ts`
- Email frontend: `apps/web/src/app/admin/settings/messaging`

## Severity Legend

CRITICAL — direct path to compromise or data loss; fix before next deploy.
HIGH — real exploit path or feature break under realistic preconditions; fix this sprint.
MEDIUM — defense-in-depth gap or operational hazard; fix soon.
LOW — hygiene; schedule.
INFO — documented behavior worth knowing.

---

## Cross-Cutting Themes

### T1. PII in logs across uploads, notifications, email

**Files:**
- `apps/api/src/modules/messaging/email-send-execution.ts:26-29` — full email body logged in console-fallback mode
- `apps/api/src/modules/messaging/email-send-execution.ts:63-66, 103-106, 135-140` — recipient address logged at info level
- `apps/api/src/modules/messaging/admin-communication.service.ts:131-137` — admin-composed body logged + persisted
- `apps/api/src/modules/assignments/assignment-events.ts:103-114` — worker names + product names live in event payloads, leak via error logs

This compounds with M7/M8 from the May security audit. **A single Pino `redact` config plus a rule that body content never enters logs closes it across all four files.**

### T2. No outbound rate limits on email or per-user invite flows — PARTIALLY CLOSED

- No retry policy on transient send failures (`email-send-execution.ts:43-78`)
- No per-user cap on verification / password-reset / supplier-invite sends
- ~~No concurrency limit on bulk supplier invites — `Promise.all` over an unbounded array (`admin-communication.service.ts:129-138`)~~ **CLOSED** by [PR #51](https://github.com/dacostaaboagye/shop-app-v2/pull/51): `admin-communication` now uses `mapWithConcurrency` from `apps/api/src/modules/_core/async-concurrency.ts` with a cap of 10 parallel requests.
- Test-send admin endpoint (`email-admin.routes.ts:38-105`) is permissioned but rate-unlimited

Pairs with M5 from the May security audit. The retry, per-user cap, and test-send rate limit remain open and worth shipping together.

### T3. Magic-byte / actual-content verification still deferred

H5 (May audit) explicitly punted this. The catalog confirm path (`apps/api/src/modules/catalog/catalog-media.service.ts:94-106`) doesn't even re-validate the MIME allowlist — only profile media does. A client can presign with `image/jpeg`, upload SVG bytes, and confirm with `mimeType: image/svg+xml`.

---

## File Uploads

### Confirmed prior fixes

- H5 profile-media MIME allowlist still in place (`apps/api/src/modules/auth/account-profile-media.service.ts:11-16, 88, 115`).

### High

**U1. No cleanup for presigned-but-unconfirmed R2 objects.**
File: `apps/api/src/infrastructure/r2-storage.ts:45`
No DB record of the presign, no R2 lifecycle policy in code, no orphan sweep. R2 storage grows unbounded.

Fix direction: either add a `presign_records` table with TTL + cleanup job, or configure R2 bucket lifecycle to expire unconfirmed objects after 24 hours, or document that orphans are expected and acceptable.

**U2. Catalog confirm doesn't re-validate MIME allowlist.**
File: `apps/api/src/modules/catalog/catalog-media.service.ts:94-106`
Profile media (post-H5) re-checks the allowlist on confirm. Catalog media does not. Same SVG-XSS class as H5, different code path.

Fix direction: import the catalog `ALLOWED_MEDIA_MIMES` set and assert `payload.mimeType` is in it inside `confirm()`. Pair with re-fetching R2 `HeadObject` to verify the actual stored Content-Type.

**U3. Frontend allows `image/avif` for profile pictures, backend rejects it.**
Files: `apps/web/src/components/system/account-profile-image-panel.tsx:164-170` vs `apps/api/src/modules/auth/account-profile-media.service.ts:11-16`
Visible UX bug. User picks AVIF, gets "not supported" error after the file picker.

Fix direction: pick one — add `image/avif` to the backend allowlist or remove from the frontend `accept` list.

### Medium

**U4. All `next/image` instances render with `unoptimized={true}`.**
Files: `apps/web/src/components/system/preview-image.tsx:99`, `person-avatar.tsx:70-80`
Disables Next.js image optimization (WebP conversion, responsive srcsets, lazy loading). Full-size R2 originals served at 40×40 avatar slots.

Fix direction: configure a Next.js Image loader for R2 (or a reverse-proxy resizer), set Cache-Control on R2 objects, drop `unoptimized`.

**U5. `MediaUploader` is a bare `<input type="file">`.**
File: `apps/web/src/components/admin/catalog/media/media-uploader.tsx:109-125`
No drag-and-drop, no progress bar, no cancel, no preview. Three-stage upload (presign → R2 PUT → confirm) collapsed into one `uploading` boolean — error messages can't tell users which stage failed.

Fix direction: rebuild as a compound component with explicit state machine (`idle | presigning | uploading{progress, eta} | confirming | success | error{stage}`); add drag-zone, progress, cancel via `AbortController`, preview thumbnail. **Pair with the design-system pilot.**

**U6. R2 delete failures silently swallowed.**
File: `apps/api/src/modules/catalog/catalog-media.service.ts:138-140`
`.catch(() => undefined)` discards delete errors. DB row gone, R2 object orphaned, no log, no metric.

Fix direction: log the error structured (storageKey, error.message), emit a metric, optionally retry once.

**U7. No `ContentLength` re-check at confirm.**
File: `apps/api/src/modules/catalog/catalog-media.service.ts:94-106`
Client claims 1 byte during presign, can upload more if R2 isn't strict. No HEAD on confirm.

Fix direction: `HeadObject` against the key during confirm, assert `ContentLength <= claimedSize`.

### Low

- No image preview after file selection.
- Catalog gallery video previews missing `controls` attribute.
- Dialog focus management in `PreviewImage` modal — no focus restore on close.
- Filename validation could explicitly reject null bytes / slashes for defense-in-depth (currently mitigated by extension-only extraction).

---

## Notifications

### High

**N1. No notifications for security-relevant events.**
Files: search across `apps/api/src/modules/auth` — no event publishers
Failed login, password change, role granted/revoked, email changed — none of these notify the affected user. Account compromise can go undetected.

Fix direction: add `security-event` event type with payloads for each auth mutation; publish from `authentication.service.ts`, `password-reset.service.ts`, `admin-user-access-write.service.ts`. Deliver via in-app + email (high priority).

**N2. All filtering is client-side over a hard-capped 50 items.**
Files: `apps/api/src/modules/notifications/postgres-notification-query.repository.ts:34-62`, `apps/web/src/components/system/notification-center-page-client.tsx:36`
List endpoint takes no `eventType`, `locationId`, `dateRange`, or `search` params — frontend filters in JS what it already received. Power users with 1000+ notifications can't see older items.

Fix direction: backend filtering + cursor-based pagination via `(status, occurredAt, notificationKey)`. Add `?eventType=…&from=…&to=…&search=…` query params.

**N3. In-app preference checked at projection time, not read time.**
File: `apps/api/src/modules/notifications/postgres-notification-recipient.repository.ts:39-56`
`filterActiveUserIds` checks `notificationInAppEnabled = true` when projecting. Disabling in-app doesn't hide existing notifications; new ones never get created. Preference changes don't take effect retroactively.

Fix direction: drop the projection-time filter, add it at read time (`listByUser` and unread-count). Project for everyone, filter at delivery.

### Medium

**N4. Bell badge isn't `aria-live`.**
File: `apps/web/src/components/system/portal-topbar.tsx:72-84`
Screen-reader users don't hear count updates. `sr-only` is static text, not a live region.

Fix direction: wrap the badge in `<span role="status" aria-live="polite" aria-atomic="true">`; announce text like "{count} unread notifications".

**N5. No polling fallback if SSE permanently fails.**
Files: `apps/api/src/modules/events/platform-events.routes.ts:28`, `apps/web/src/components/providers/notification-live-provider.tsx:13`
3s reconnect handles transient drops; for sustained failures (e.g., proxy strips SSE), users must click Refresh.

Fix direction: add a 60-second `refetchInterval` as a safety net when the SSE stream is in error state.

**N6. Live-event handler invalidates instead of optimistically prepending.**
File: `apps/web/src/components/providers/notification-live-provider.tsx:37-46`
Visible blink on every arrival.

Fix direction: prepend the new event payload to the React Query cache, then debounce a background refetch.

**N7. Per-candidate permission checks inside a loop.**
File: `apps/api/src/modules/notifications/platform-event-notification-projector.ts:40-65`
N permission resolutions per event. Currently fast enough; will hot-spot at scale.

Fix direction: batch permission resolution — fetch all assignments + overrides for the candidate set once, evaluate in memory.

**N8. Sound but no `navigator.vibrate()` on mobile.**
File: `apps/web/src/components/providers/notification-live-provider.support.ts:14-43`
Workers on phones with sound off get nothing.

Fix direction: `if (navigator.vibrate) navigator.vibrate([100, 50, 100])` next to the audio chime, gated on the same preference flags.

**N9. `mark-all-read` returns `updatedCount`, not new unread count.**
Files: `apps/api/src/modules/notifications/notification-write.service.ts:25-29`, `packages/contracts/src/notifications.ts:44-46`
Forces a refetch round-trip to update the badge.

Fix direction: return both fields.

### Low

- No per-event-type preference granularity.
- Notification cards show actor *slug* not name/avatar; cards aren't clickable to the underlying resource.
- No mark-read on view (Intersection Observer-based auto-mark).

---

## Email (Follow-up to 2026-04-24 audit)

### Confirmed prior fixes

All seven April fixes verified still in place:

- **B1** — `email.service.ts` 259 lines, `email-html-layout.ts` 245 lines (under 250).
- **B2** — `email-html-layout.ts:244` uses `line-height:52px` for text-fallback logo.
- **B3** — `email.service.ts:151` uses injected `webBaseUrl`; `app.example.com` is an explicit fallback only.
- **B4** — `EmailOperationsPanel` no longer accepts `defaultTargetEmail`.
- **Q1** — `escapeHtml` exported once from `email-html-layout.ts:219`.
- **Q2** — `email_test` message type exists and is used.
- **Q3** — `ResendEmailWebhookService` constructs `Resend` only on demand.

### High

**E1. Resend webhook timestamp window not validated.**
File: `apps/api/src/modules/messaging/resend-email-webhook.service.ts:133-150`
SDK signature verification trusts the timestamp without an explicit window check. Replay of old bounce events possible. Idempotency via `providerEventId` blocks duplicate event recording, but a *different* old real bounce still suppresses the recipient.

Fix direction: explicit check — `Math.abs(Date.now() - new Date(headers.timestamp).getTime()) > 5*60*1000` → reject.

**E2. Webhook event type coverage incomplete.**
File: `apps/api/src/modules/messaging/resend-email-webhook.service.ts:179-200`
`email.opened`, `email.clicked`, `email.unsubscribed` return null and are dropped silently. Future analytics needs are forfeited.

Fix direction: handle them explicitly even if the action is just record-only; or document the deliberate scope ("delivery status only").

**E3. No retry on transient send failures.**
File: `apps/api/src/modules/messaging/email-send-execution.ts:43-78`
Single `await transport.send(...)`. Resend 5xx → password reset email is lost; the caller's `console.error(err)` silently swallows.

Fix direction: exponential backoff (3-5 attempts over ~5 minutes) at minimum. Outbox pattern if retries must survive process restarts.

**E4. From-address domain not validated against the brand.**
File: `apps/api/src/modules/messaging/email-html-layout.ts:131-132` + `email-configuration.ts`
Admin can configure a from-address on a domain they don't own. Brand name is freely set. Phishing template potential.

Fix direction: enforce a from-address allowlist (DNS-verified domains only) at admin-settings save time. Document DKIM/SPF/DMARC requirements.

### Medium

**E5. Test-send admin endpoint is rate-unlimited.**
File: `apps/api/src/modules/messaging/email-admin.routes.ts:38-105`
1000 test sends in 1 second possible; exhausts Resend quota.

Fix direction: per-user rate limit (5/min, 50/day) using `@fastify/rate-limit` with `keyGenerator: req => req.auth.userId`.

**E6. No operator visibility into bounces, complaints, queue depth, Resend quota.**
File: `apps/api/src/modules/messaging/email-operations.service.ts:29-60`
Diagnosing "why didn't an email arrive" requires direct DB queries.

Fix direction: add `/api/admin/settings/email/health` returning `{ totalBouncedLast30d, totalComplaintsLast30d, deliveryRate, resendQuotaUsed }`.

**E7. Webhook parse failures throw 500, causing Resend retry storms.**
File: `apps/api/src/modules/messaging/resend-email-webhook.service.ts:76`
Persistent malformed payload hammers the API.

Fix direction: catch parse errors, log them, return 200 OK; emit a platform event so operators see the failure.

**E8. No unique constraint on `(provider, providerMessageId)`.**
File: `packages/database/src/schema/email-delivery.ts:25-45`
Request-level retries double-count in `email_delivery_attempts`.

Fix direction: partial unique index where `providerMessageId IS NOT NULL`.

### Low

- No preheader/preview text in templates.
- No i18n; English-only and undocumented as a policy.

---

## Things Done Well (Don't Regress)

- **Uploads:** direct-to-R2 transfer, signed `ContentLength`, transactional confirm + reference-counted delete, unique-primary index at the DB level, RBAC at route level on catalog media, audit trail via `uploadedBy` / `assignedBy`.
- **Notifications:** idempotent projection via `(userId, eventId)` unique constraint, durable event delivery with retry, SSE for real-time, proper loading/empty/error states, sound respects user prefs, schema-enforced `(status, readAt)` correlation.
- **Email:** bounce/complaint suppression enforced, plain-text fallback for every send path, HTML escape applied consistently, webhook idempotency via `providerEventId`, secure token storage (sha256 hashed at rest, single-use, time-bound), email-client compatibility (tables + inline styles + `mso-line-height-rule`).

---

## Recommended Remediation Order

1. **PR1: Pino redact + body-content rule** — closes T1 across uploads, notifications, email. One commit, broad value.
2. **PR2: Catalog confirm MIME re-validation** — mirrors H5; tiny change.
3. **PR3: Resend webhook timestamp + dead-letter** — closes E1 + E7.
4. **PR4: Per-user rate limits + bulk-invite concurrency cap** — closes T2 / E5 / V1 / V2 from email audit.
5. **PR5: Frontend AVIF allowlist alignment** — visible UX fix; tiny.
6. **PR6: Notification API backend filtering + read-time preference check + cursor pagination** — covers N2 + N3.
7. **PR7: Security event notifications** — N1.
8. **PR8: `MediaUploader` rebuild + AVIF + UX** — pair with the design-system pilot.
9. **PR9: Magic-byte verification at confirm** — closes the deferred H5 follow-up + U7.

PRs 1-5 are small and independent; ship this week. PRs 6-9 are bigger and worth pairing with the broader design pilot.
