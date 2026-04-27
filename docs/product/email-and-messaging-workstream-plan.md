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

## Current Status

Completed evidence so far:

- `E-03-05B1`
  - messaging remains the shared owner for transactional email delivery
  - auth, admin test-send, and supplier invite paths now use the same
    configured `EmailService` instance from the main API runtime
  - focused coverage exists for auth recovery, supplier invite, and shared
    email send behavior
- `E-03-05B2`
  - preview and live send now resolve from one runtime path
  - focused parity tests cover password reset and email verification preview vs
    live send
- `E-03-05B4`
  - admins can inspect recent attempts, current mode, reply-to, support email,
    and recipient state
  - immediate provider send failures now emit durable `messaging.email.failed`
    platform events instead of relying on logs alone
- `E-03-05B5`
  - webhook ingestion remains idempotent and append-only
  - recent-attempt operations coverage now proves operator visibility for
    delayed and failed lifecycle states
- `E-03-05B6`
  - blocked-recipient policy is enforced in the shared runtime
  - focused evidence exists for admin test-send, auth resend, supplier portal
    invite, and shared email send blocking
- `E-03-05B7`
  - recipient-state lookup is exposed in product
  - the same clear-to-send / blocked decision path is now shared between admin
    email operations and supplier portal invite controls

Remaining gaps before this workstream is fully done:

- `E-03-05B3`
  - manual checks still need to be recorded against a real desktop and mobile
    mail client before launch
- `E-03-05B4`
  - if launch requires notification/audit evidence for every important
    email-triggered business event, that broader event coverage is still
    incomplete outside the current transactional send failure path
- `E-03-05B5`
  - if launch requires explicit delayed-delivery alerting beyond the operations
    surface, that projection work is still open

Recommended exit condition for `E-03-05B`:

- do not leave this workstream until `E-03-05B3` has explicit evidence and the
  remaining operator visibility decision around delayed-delivery projection is
  resolved

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
- current evidence:
  - shared email HTML now uses safer long-content handling and mobile stacking
    for brand header and CTA blocks
  - focused tests cover dark mode, mobile CTA/header stacking rules, and
    break-safe handling for long brand names, support addresses, headings,
    button labels, and fallback links
  - generated review fixtures now live under
    `docs/product/evidence/email-template-review-fixtures/*`
  - the release checklist for the remaining desktop/mobile client review lives
    in [email-template-client-review.md](./email-template-client-review.md)

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

### `E-03-05B6` suppression-aware send safety

Goal:
- prevent blind retries to recipients already known as undeliverable or unsafe

Acceptance criteria:

- the messaging runtime checks the latest known provider lifecycle state before
  sending transactional email
- sends are blocked when the latest known state for a recipient is `bounced`,
  `suppressed`, or `complained`
- blocked sends return structured problem details with enough context for
  operators to act safely

Definition of done:

- auth resend, supplier invite, password reset, and test-send paths inherit the
  same runtime policy without route-specific duplication
- focused tests cover blocked send behavior and the admin test-send route
- no send path reaches the provider when the delivery policy blocks the
  recipient

### `E-03-05B7` recipient-state diagnostics in product

Goal:
- show operators whether a recipient is currently blocked before they retry a
  send

Acceptance criteria:

- email operations exposes a recipient-state lookup backed by the messaging
  runtime
- the email operations UI shows whether the current target address is clear to
  send or blocked
- blocked state shows the provider status, timestamp, and latest known reason

Definition of done:

- the UI does not rely on parsing a failed send response to explain recipient
  state
- focused API and web checks cover the lookup contract and visible operator
  state
- send remains disabled when the recipient is already known as blocked
