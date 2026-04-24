# ADR 0012: Operational Updates Use A Platform Event Backbone

## Status

Accepted

## Context

Several modules already need live operational updates, audit-friendly state
changes, and cross-surface notifications:

- stock transfers
- stock balance changes
- worker assignments and handovers
- deliveries
- admin override actions
- future alerts, activity feeds, and operational analytics

If each module introduces its own bespoke socket channel, notification writer,
or event table, the system will fragment quickly. The repo already favors
append-only accountability and explicit service boundaries, which makes a shared
event publication model the more stable direction.

## Decision

- The platform uses one generic backend event backbone rather than
  feature-specific realtime implementations.
- Domain modules emit typed operational events through a shared outbox or domain
  event publication pattern.
- Event names remain domain-specific, but the transport and storage pattern are
  shared across the platform.
- Initial consumers include:
  - server-sent event streams
  - in-app notifications
  - activity feeds
  - query invalidation hints
  - future analytics and operational projections
- WebSockets are not the default transport. Server-sent events are preferred
  first for server-to-client operational updates. WebSockets are reserved for
  workflows that truly require bidirectional live coordination.
- Event delivery to clients is filtered by actor permission and operating scope.

Illustrative event families:

- `transfer.*`
- `stock.*`
- `assignment.*`
- `handover.*`
- `delivery.*`
- `order.*`
- `access.*`
- `notification.*`

## Consequences

- Realtime work in any one module should extend the shared event backbone rather
  than inventing a new per-module channel model.
- Transfer, assignment, and delivery features can share one notification and
  streaming infrastructure.
- Event schema design becomes a platform concern and must stay narrow,
  permission-aware, and domain-oriented.
- Some future features may still need specialized live collaboration channels,
  but those will sit on top of the platform event model rather than replacing
  it.
