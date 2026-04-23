# Email And Messaging Workstream Plan

Backlog ticket: `E-03-05B`

This workstream turns email delivery from an auth-owned helper into a dedicated
messaging capability with one configuration runtime, production diagnostics, and
email-client-safe templates.

Related architecture:

- [ADR 0016](../architecture/adr/0016-dedicated-messaging-module-and-email-runtime.md)
- [ADR 0012](../architecture/adr/0012-platform-event-backbone.md)
- [ADR 0013](../architecture/adr/0013-platform-event-delivery-uses-a-durable-outbox-loop.md)
- [ADR 0014](../architecture/adr/0014-official-documents-branding-and-money-configuration.md)
- [ADR 0015](../architecture/adr/0015-supplier-procurement-and-conversation-lifecycle.md)

## Product Principles

- Email is supporting infrastructure, not the source of truth.
- In-app events and notifications remain authoritative when email fails.
- All transactional email delivery uses one messaging runtime.
- Preview and live send must resolve the same brand, sender, and template data.
- HTML and plain-text variants are both user-facing outputs and must both read
  well.
- Operators need diagnostics, not just logs.

## Execution Slices

### `E-03-05B1` dedicated messaging module extraction

Goal:
- move email infrastructure out of auth and into a dedicated messaging module

Acceptance criteria:

- email service, template renderer, delivery recorder, and related types live
  under `apps/api/src/modules/messaging/*`
- auth and admin/supplier flows depend on messaging imports, not auth-owned
  email helpers
- no route or domain service reaches directly into another module's private
  persistence for email delivery

Definition of done:

- imports are updated without behavior drift
- focused tests pass for auth and supplier invite email flows
- docs point to messaging as the email-system owner

### `E-03-05B2` single email configuration runtime

Goal:
- make preview and live send resolve from one email configuration path

Acceptance criteria:

- auth, supplier, and future platform emails resolve brand, sender, logo, and
  templates from one runtime
- preview uses the same resolved sender model as live send
- sender semantics distinguish `from`, `replyTo`, display brand, and business
  contact

Definition of done:

- auth and supplier invite runtime wiring is unified
- tests cover preview/live-send parity on sender and brand data
- no hard-coded sender values remain in runtime code

### `E-03-05B3` email template hardening

Goal:
- make the templates resilient across major email clients and mobile layouts

Acceptance criteria:

- template HTML uses safer layout constraints for major email clients
- dark-mode behavior is intentionally handled
- mobile spacing and CTA layout hold up on narrow screens
- plain-text copy is reviewed independently from HTML

Definition of done:

- tests cover rendered HTML/text snapshots where practical
- manual checks are recorded against at least one desktop and one mobile client
- preview output and sent output remain aligned

### `E-03-05B4` email diagnostics and operations

Goal:
- expose a usable operator surface for email health and support

Acceptance criteria:

- admins can send a test email
- admins can inspect recent delivery attempts and statuses
- operators can see whether the app is in live-send or console-fallback mode
- missing provider configuration is visible through a health or diagnostics
  surface

Definition of done:

- support paths do not depend on server logs alone
- structured error states remain safe and human-readable
- in-app notifications exist for important email-triggered business events

### `E-03-05B5` provider lifecycle integration

Goal:
- handle delivery state beyond initial provider acceptance

Acceptance criteria:

- provider webhook ingestion can reconcile delivered, bounced, complained, or
  suppressed messages
- delivery-attempt status model supports later provider updates
- operators can see when initial send succeeded but later delivery failed

Definition of done:

- webhook handling is idempotent
- delivery history preserves append-only state transitions
- future resend logic uses the latest known provider state safely
