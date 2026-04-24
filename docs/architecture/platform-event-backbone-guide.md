# Platform Event Backbone Guide

Last updated: 2026-04-20

This document explains the current event and notification architecture in plain
engineering terms: what it is, how it works, why it exists, where it is strong,
where it is still weak, and what needs to migrate onto it over time.

It complements:

- [ADR 0011](./adr/0011-stock-transfer-workflow-and-operating-scope.md)
- [ADR 0012](./adr/0012-platform-event-backbone.md)
- [ADR 0013](./adr/0013-platform-event-delivery-uses-a-durable-outbox-loop.md)

## Purpose

The platform event backbone exists so operational change is represented once and
consumed many ways.

Instead of each module inventing its own:

- notification writer
- live stream shape
- activity log row
- query invalidation path
- audit-friendly update record

the platform publishes one typed operational event and lets shared consumers
handle delivery.

## What exists today

Current real producer:

- stock transfer request lifecycle

Current consumers:

- durable `platform_events`
- durable `platform_event_audiences`
- durable `user_notifications`
- authenticated SSE stream
- notification tray
- notification center pages in each portal shell
- admin delivery-health endpoint
- dedicated platform event delivery worker

## Core architecture

The design separates four concerns:

1. domain modules decide that something operational happened
2. the shared publisher stores the event durably
3. a delivery loop claims pending events and projects them
4. frontend surfaces consume durable notifications and live invalidation

That separation matters. A stock request route should not know how to resolve
notification recipients, how to update a tray badge, or how to keep SSE
connections alive.

## Shared event contract

Shared event types live in:

- `apps/api/src/modules/events/platform-event.types.ts`

Important fields:

- `id`
- `type`
- `summary`
- `resource`
- `payload`
- `audience`
- `occurredAt`

The critical decision is that the event carries both:

- what happened
- who should be allowed to receive it

## Audience model

The audience is explicit and durable.

Supported audience kinds:

- `user`
- `permission`

Examples:

- a requesting worker receives the event directly as `user`
- source managers receive it through `permission = stock.supply.manage`
  scoped to a source location
- admins receive it through a broader admin permission

This is what keeps the architecture platform-wide instead of transfer-only. The
same model can support:

- `transfer.*`
- `stock.*`
- `assignment.*`
- `handover.*`
- `delivery.*`
- `order.*`
- `access.*`
- `notification.*`

## Persistence model

### `platform_events`

This is the immutable operational event log.

It stores:

- event identity and type
- human summary
- public resource reference
- actor slug
- structured payload
- occurrence time
- delivery state
- retry metadata
- failure metadata

The important production change is that event rows now also track:

- `delivery_status`
- `delivery_attempts`
- `available_at`
- `last_attempt_at`
- `processing_started_at`
- `delivered_at`
- `last_error`

That turns the table from a passive log into a durable delivery queue as well.

### `platform_event_audiences`

This stores durable visibility rules for each event.

It is important because visibility is part of the event contract, not only a
live calculation.

### `user_notifications`

This stores per-user mutable notification state.

Events stay immutable. User acknowledgement state is separate.

## Runtime flow

The current runtime path is:

1. a domain route completes its business write
2. the route publishes a `PlatformEventRecord`
3. the shared publisher appends the event and its audiences to Postgres
4. the delivery loop claims pending events from `platform_events`
5. the notification projector resolves recipients and inserts unread
   `user_notifications`
6. the event is marked `delivered`
7. the in-memory bus publishes a best-effort live event for connected SSE
   clients
8. the web app invalidates notification queries when live events arrive

The important shift is that notification projection is no longer in the request
path. Publishing is durable append first; delivery happens in the background
loop.

For stock transfer mutations, event append now happens inside the same database
transaction as the originating supply-request write. Delivery is still triggered
only after the transaction callback commits, so consumers never see an event for
a rolled-back mutation.

The delivery loop now drains all currently claimable work before sleeping again.
That prevents a large backlog from taking one polling interval per batch to
catch up.

## Runtime controls

The API exposes the following environment controls:

- `PLATFORM_EVENT_DELIVERY_ENABLED`
  Defaults to `true`. Set to `false` when delivery is moved to a separately
  deployed worker process so API instances only append events.
- `PLATFORM_EVENT_DELIVERY_BATCH_SIZE`
  Defaults to `20`. Controls how many claimable events a dispatcher locks per
  batch.
- `PLATFORM_EVENT_DELIVERY_POLL_INTERVAL_MS`
  Defaults to `2000`. Controls idle polling frequency after the dispatcher has
  drained available work.
- `PLATFORM_EVENT_DELIVERY_PROCESSING_LEASE_MS`
  Defaults to `60000`. Controls when an event left in `processing` is treated as
  stale and can be reclaimed by another delivery run.

These settings make local development simple while preserving a production path
where delivery is disabled on web/API nodes and enabled only in worker nodes.

Recommended production split:

- API/web process:
  `PLATFORM_EVENT_DELIVERY_ENABLED=false`
- Event worker process:
  `PLATFORM_EVENT_DELIVERY_ENABLED=true`
  running `pnpm --filter @shop/api events:worker` locally or
  `pnpm --filter @shop/api start:events` after a production build

The API still appends event rows transactionally with domain writes. The worker
owns claiming pending rows, projecting notifications, retries, and failure
state transitions.

## Observability

Admins with `admin.dashboard.view` can inspect delivery health through:

- `GET /api/admin/platform-events/delivery-health`

The response is contract-backed by `packages/contracts/src/platform-events.ts`
and includes:

- status counts for `pending`, `processing`, `delivered`, and `failed`
- pending, processing, delivered, and failed totals
- stuck processing count using the configured processing lease
- oldest pending event timestamp
- oldest failed event timestamp
- generated-at timestamp

This endpoint is intentionally read-only. It gives the future admin dashboard,
ops scripts, and health checks a stable place to detect delivery backlog,
poisoned events, and stuck processing leases.

## Backend components

### Producer side

- `apps/api/src/modules/stock/stock-supply-event-publisher.ts`
- `apps/api/src/modules/stock/supply-request.routes.ts`

### Storage and delivery

- `apps/api/src/workers/platform-event-delivery-worker.ts`
- `apps/api/src/modules/events/create-platform-event-runtime.ts`
- `apps/api/src/modules/events/platform-event-pipeline.publisher.ts`
- `apps/api/src/modules/events/postgres-platform-event.repository.ts`
- `apps/api/src/modules/events/platform-event-delivery.service.ts`
- `apps/api/src/modules/events/platform-event-delivery-loop.ts`
- `apps/api/src/modules/events/platform-event-delivery-worker-runtime.ts`
- `apps/api/src/modules/events/postgres-platform-event-delivery-health.repository.ts`
- `apps/api/src/modules/events/platform-event-delivery-health.service.ts`
- `apps/api/src/modules/events/platform-event-admin.routes.ts`
- `apps/api/src/modules/notifications/platform-event-notification-projector.ts`

### Live delivery

- `apps/api/src/modules/events/in-memory-platform-event-bus.ts`
- `apps/api/src/modules/events/platform-events.routes.ts`

### Query and mutation API for notifications

- `apps/api/src/modules/notifications/notification.routes.ts`
- `apps/api/src/modules/notifications/notification-query.service.ts`
- `apps/api/src/modules/notifications/notification-write.service.ts`

## Frontend surfaces

### Live stream integration

- `apps/web/src/components/providers/notification-live-provider.tsx`
- `apps/web/src/lib/notifications/platform-event-stream.ts`

### Notification read models

- `apps/web/src/lib/react-query/notifications.ts`

### UX surfaces

- tray dialog in `apps/web/src/components/system/portal-overlays.tsx`
- notification center pages through
  `apps/web/src/components/system/notification-center-page-client.tsx`

## Why this architecture is good

### Pros

- One event can drive many surfaces.
  Notifications, live invalidation, future activity feeds, and analytics can
  all derive from the same source.

- Domain code stays cleaner.
  Stock transfer routes emit events. They do not own notification storage,
  audience expansion, or SSE plumbing.

- Delivery is more resilient than the earlier inline model.
  Pending events survive process restarts because delivery state is durable.

- Notification state is modeled correctly.
  Immutable event evidence is separated from mutable read state.

- Permission-aware delivery is first-class.
  The event is stored with durable audience rules and the backend filters both
  notification projection and SSE access accordingly.

- Retry behavior now exists.
  Transient failures do not require manual republishing of domain actions.

- Delivery state is observable.
  Admins can see pending, failed, processing, and stuck delivery counts without
  querying the database directly.

- Backlogs drain faster.
  The delivery loop keeps claiming available batches until no work remains
  instead of sleeping between every batch.

- Production deployment is easier to split.
  API instances can disable delivery while a worker process owns the same
  delivery loop and durable queue.

- Delivery is no longer tied to HTTP server uptime.
  The dedicated worker can be restarted, scaled, and monitored separately from
  request-serving API instances.

- Frontend UX is now backend-driven.
  The shell tray and notification center use real APIs instead of placeholder
  data.

## What is still not production-ready enough

### Cons

- Transactional outbox coverage is not platform-wide yet.
  Stock transfer mutations append events inside the same transaction as their
  supply-request write. Other future producers must adopt the same pattern as
  they migrate onto the event backbone.

- The dispatcher can now run as a separate process, but worker coordination is
  still Postgres-backed only.
  `FOR UPDATE SKIP LOCKED` prevents duplicate claims across workers. We still
  need deployment-level controls for worker count, alerting, and restart policy.

- SSE delivery is still process-local.
  The in-memory bus works well when the API process also runs delivery. In a
  split API/worker deployment, durable notifications still work, but live SSE
  invalidation requires the next shared fan-out or replay-safe stream phase.

- Replay to clients is incomplete.
  We do not yet support `Last-Event-ID`, cursor-based replay, or resumable live
  streams from the stored event log.

- Notification UX is improved, but not complete.
  The frontend now has a tray and center pages, but not yet:
  - cursor pagination
  - notification preferences
  - deep-link routing per event type
  - per-surface quieting or batching

- Only one domain is producing events right now.
  The architecture is platform-wide, but stock transfer is still the only real
  producer using it.

## Mitigations already in place

- Delivery retries are durable.
- Stock transfer event append is transactional with the originating
  supply-request write.
- Notification inserts are idempotent through unique constraints.
- Live publish is best-effort after durable delivery, so temporary SSE failure
  does not lose durable notification state.
- Frontend data is query-based, so missed live events recover on refetch.
- The producer interface is stable, so future migration to a separate worker or
  broker does not require changing every domain route.
- Delivery loop tuning is environment-driven, so batch size, poll cadence, and
  stale processing lease can change without code changes.
- Delivery-health data is available through a protected API endpoint for admin
  dashboards and operational checks.
- A dedicated worker entrypoint can own event delivery while API instances only
  append outbox rows.

## What should be done next

### Highest-value hardening

1. Add replay-safe live delivery from stored events.
2. Add a retry/replay admin action for failed events once the control-tower UX
   exists.
3. Add worker deployment guidance for health checks, one-or-more worker
   replicas, and alerts on failed/stuck events.
4. Require every new event producer to append through the caller-owned
   transaction when the event is derived from a database write.

### Frontend hardening

1. Add cursor pagination for notification center pages.
2. Add event-type deep links so operators can jump from a notification into the
   relevant workflow detail page.
3. Add notification preferences and quieting rules once more domains publish
   events.

### Domain migration

This architecture should gradually absorb other modules, but they do not all
need to migrate at once.

The right migration rule is:

- migrate modules that currently need durable operational notifications, live
  updates, or cross-surface activity history
- do not migrate purely static CRUD screens just for the sake of uniformity

The best next producer candidates are:

- administration and access changes
- worker assignment and handover flows
- delivery operations
- stock balance and reservation exceptions

## Does administration need to migrate?

Yes, but selectively.

Administration should migrate when an admin action has operational value outside
the page where it was performed. Good examples:

- role assignment or revocation
- permission override changes
- user suspension or reactivation
- location activation or archival
- supplier or catalogue state changes that should notify operators

These should publish domain events such as:

- `access.role_assigned`
- `access.role_revoked`
- `access.override_set`
- `user.status_changed`
- `location.status_changed`

Administration does not need to force every screen into the new architecture.
Simple read-only directory pages can stay as normal request/response screens.
The migration target is operational change, not every UI route.

## Recommended migration strategy

1. Keep the platform event contract generic.
2. Add producers only where there is real operational value.
3. Reuse the same durable audience and notification model.
4. Avoid bespoke realtime implementations in new domains.
5. Keep each domain responsible only for emitting well-formed events after its
   own business write succeeds.

## Files to read in order

1. `apps/api/src/modules/events/platform-event.types.ts`
2. `apps/api/src/modules/events/platform-event-pipeline.publisher.ts`
3. `apps/api/src/modules/events/postgres-platform-event.repository.ts`
4. `apps/api/src/modules/events/platform-event-delivery.service.ts`
5. `apps/api/src/modules/events/platform-event-delivery-loop.ts`
6. `apps/api/src/workers/platform-event-delivery-worker.ts`
7. `apps/api/src/modules/stock/stock-supply.service.ts`
8. `apps/api/src/modules/notifications/platform-event-notification-projector.ts`
9. `apps/api/src/modules/events/platform-events.routes.ts`
10. `apps/api/src/modules/notifications/notification.routes.ts`
11. `apps/web/src/components/providers/notification-live-provider.tsx`
12. `apps/web/src/components/system/notification-center-page-client.tsx`

## Summary

The architecture is now meaningfully stronger than the first event slice:

- events are typed
- events are durable
- audiences are durable
- notification state is durable
- delivery retries are durable
- delivery health is observable
- delivery can run in a dedicated worker process
- stock transfer event append is transactional with supply-request writes
- frontend notifications are backend-driven
- live updates invalidate the same read models the UI uses

The biggest remaining production gaps are:

- multi-instance live delivery and replay
- worker deployment runbooks and alerting
- deeper domain adoption beyond stock transfer
