# Email System Audit

Audited: 2026-04-24  
Branch: feature/e-01-01-page-permission-refactor  
Status: All fixes shipped and covered by tests (2026-04-24)

## What Was Audited

All files under `apps/api/src/modules/messaging/`, related contracts in
`packages/contracts/src/`, database schema in
`packages/database/src/schema/email-delivery.ts`, the official-documents
module (template settings), and the frontend admin pages under
`apps/web/src/app/admin/settings/messaging/`.

---

## Architecture Assessment

The messaging module correctly implements ADR 0016. Email delivery is
isolated from the auth module, all dependencies are injected, the two-table
audit design (attempts + status events) is correct, webhook idempotency is
enforced via `onConflictDoNothing` on `providerEventId`, and both HTML and
plain-text variants are generated for every send path. The template provider
abstraction ensures live send and preview resolve from the same configuration
model.

---

## Bugs Found

### B1 — File size limit violations (blocks commits)

`email.service.ts` is 286 lines; `email-template-renderer.ts` is 275 lines.
Both exceed the 250-line source file limit enforced by `guard:file-length`.
Every future commit touching either file will be blocked at pre-commit until
they are split.

**Fix:** Extract HTML layout generation into `email-html-layout.ts` and
email send/record logic into `email-send-execution.ts`.

**Resolution:** Both files are now under the 250-line limit. `email-html-layout.ts`
owns the HTML/text generation and `escapeHtml`. `email-send-execution.ts` owns
transport dispatch and delivery recording. `email.service.ts` is now 185 lines.
Covered by `test/email-html-layout.test.ts`.

### B2 — `display:flex` in email logo fallback

`email-template-renderer.ts` `brandLogoHtml()` renders a `<div>` with
`display:flex` inline styles when no logo image URL is configured. Flexbox is
not supported in Outlook or many older mobile email clients. The brand
abbreviation text will not be centered for those recipients.

**Fix:** Replace with `line-height` equal to the container height, which is
universally supported in email clients.

**Resolution:** `brandLogoHtml()` in `email-html-layout.ts` now uses
`line-height:52px` for the text fallback logo. Asserted in
`test/email-html-layout.test.ts` — the test fails if `display:flex` ever
re-appears.

### B3 — Test email CTA links to `app.example.com`

`email.service.ts` `sendTestEmail()` hardcodes
`actionUrl: "https://app.example.com/email-test"`. Every test email sent from
the admin operations panel contains a non-functional call-to-action button.
`webBaseUrl` already exists in `ApiEnv` and is available at runtime
construction.

**Fix:** Accept `webBaseUrl` in `EmailServiceOptions` and thread it through
`createMessagingRuntime`.

**Resolution:** `webBaseUrl` is a named option in `EmailServiceOptions`, set in
`createMessagingRuntime` from `env.webBaseUrl`. `sendTestEmail` uses
`` `${this.webBaseUrl}/` `` as the action URL. Two test cases in
`test/email.service.test.ts` assert the injected URL appears in rendered output
and that the fallback to `app.example.com` is present when no URL is injected.

### B4 — `EmailOperationsPageClient` makes a redundant API call

`email-operations-page-client.tsx` fetches the full official document settings
(`/api/admin/settings/documents`) just to extract `business.email` as the
default target address for the test email input. `EmailOperationsResponse`
already includes `supportEmail` — returned by the same
`/api/admin/settings/email/operations` call that `EmailOperationsPanel` makes
internally. This is a wasted request on every page load.

**Fix:** Remove the settings query from the page client. Derive
`defaultTargetEmail` from `operationsQuery.data.supportEmail` inside
`EmailOperationsPanel` and remove the prop.

**Resolution:** `EmailOperationsPanel` no longer accepts a `defaultTargetEmail`
prop. A `useEffect` initialises `targetEmail` from `operationsQuery.data.supportEmail`
once data loads. The redundant `/api/admin/settings/documents` call is removed
from `email-operations-page-client.tsx`.

---

## Code Quality Issues

### Q1 — `escapeHtml` duplicated across two files

An identical private `escapeHtml` function is defined in both
`email-template-renderer.ts` and `fallback-email-templates.ts`. A security
patch to one will not apply to the other.

**Fix:** Export `escapeHtml` from `email-html-layout.ts` and import it in
`fallback-email-templates.ts`.

**Resolution:** `escapeHtml` is exported from `email-html-layout.ts` and
imported in `fallback-email-templates.ts`. Tested in
`test/email-html-layout.test.ts`.

### Q2 — Test sends recorded as `email_verification` message type

`sendTestEmail()` records `messageType: "email_verification"`. Test sends are
indistinguishable from real verification emails in the delivery audit log and
the operations panel.

**Fix:** Add `"email_test"` to `EmailOptions["messageType"]` and use it in
`sendTestEmail`.

**Resolution:** `EmailMessageType` in `email-service.types.ts` includes
`"email_test"`. `sendTestEmail` uses `messageType: "email_test"`. The
`formatDeliveryStatus` mapping in the frontend panel handles `email_test`
correctly. Asserted in `test/email.service.test.ts`.

### Q3 — `ResendEmailWebhookService` abuses the Resend SDK with a fake key

The class instantiates `new Resend("webhook-verifier")` at construction time,
using a hardcoded fake API key solely to access
`this.resend.webhooks.verify(...)`. If the Resend SDK validates the key on
construction in a future version, webhook verification will break silently in
production.

**Fix:** Inject the verify function as a dependency (the signature already
exists as `verifier?` in `ResendWebhookDependencies`). Default to a
module-level function that calls `new Resend("stub").webhooks.verify` only
when needed, or extract the verify call to a helper that constructs the
minimal object on demand.

**Resolution:** The class-level `private readonly resend = new Resend(...)` is
removed. A module-level `verifyResendWebhook()` function constructs a minimal
`Resend` instance on demand (only called when signature verification is
required). The `verifier` dependency allows tests to inject a no-op parser
without touching the SDK at all. Covered by `test/resend-email-webhook.service.test.ts`.

---

## Fix Priority

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| B1 | File size violations | P0 — blocks all future commits | ✅ Fixed |
| B2 | `display:flex` email layout | P1 — rendering bug for Outlook users | ✅ Fixed |
| B3 | Hardcoded test email URL | P1 — test emails non-functional | ✅ Fixed |
| B4 | Redundant API call in operations page | P1 — unnecessary network request | ✅ Fixed |
| Q1 | `escapeHtml` duplication | P2 — resolved as part of B1 split | ✅ Fixed |
| Q2 | Test message type | P2 — audit log clarity | ✅ Fixed |
| Q3 | Resend fake-key SDK | P2 — fragile dependency | ✅ Fixed |
