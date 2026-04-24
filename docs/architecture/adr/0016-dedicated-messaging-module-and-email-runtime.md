# ADR 0016: Dedicated Messaging Module And Unified Email Runtime

## Status

Accepted for phased implementation.

## Context

Email delivery started inside the auth module for verification and password
reset. The platform now also sends supplier invitations and will soon send
quote, purchase-order, and broader operational notifications. Keeping email
delivery under auth is no longer structurally correct.

The current runtime also diverges:

- auth emails resolve template and brand settings through one path
- admin and supplier invite emails can be constructed through a separate path
- preview and live send can diverge on sender details

The system already has durable platform events and in-app notifications. Email
should be supporting messaging infrastructure, not an auth-owned helper.

## Decision

The platform will move email delivery into a dedicated `messaging` module.

- Email transport, template rendering, sender resolution, delivery recording,
  and diagnostics live under `apps/api/src/modules/messaging/*`.
- Auth, supplier, and future business workflows depend on messaging through
  explicit service interfaces.
- There is one email configuration runtime for live send and preview.
- Sender semantics are explicit:
  - transport `from`
  - provider-level `replyTo` when used
  - display brand identity
  - business contact details for human support
- HTML and plain-text email variants are both first-class artifacts.
- Email previews render from the same resolved configuration model used for live
  delivery.
- Delivery attempts remain durable and body content stays out of the delivery
  audit table.

## Consequences

- Email infrastructure files move out of `auth`.
- Admin directory and auth runtimes stop constructing separate email service
  variants.
- Supplier invite, verification, password reset, and future platform emails can
  share one branded template pipeline.
- A dedicated admin email operations surface becomes a first-class requirement,
  not a future convenience.
- Future webhook ingestion, bounce handling, and suppression logic can attach to
  messaging without polluting auth.
