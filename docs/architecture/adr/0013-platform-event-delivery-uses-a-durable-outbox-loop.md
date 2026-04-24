# ADR 0013: Platform Event Delivery Uses A Durable Outbox Loop

## Status

Accepted

## Context

ADR 0012 established that operational updates should flow through one shared
platform event backbone. The first implementation persisted events and then
projected notifications plus live SSE delivery inline in the request path.

That was a useful intermediate step, but it left production risks:

- request latency depended on notification projection work
- transient projector failures could fail the publish path late
- there was no durable retry state for partially delivered events
- recovery after process restart depended only on ad hoc republishing

We need a delivery model that keeps the producer interface stable while making
delivery safer and more recoverable.

## Decision

- Domain routes continue to publish `PlatformEventRecord` objects through the
  shared publisher interface.
- Publishing now appends the event and its audiences to durable storage only.
- Domain services can append through a caller-owned transaction. Stock transfer
  mutations use this path so the supply-request write and `platform_events`
  append commit or roll back together.
- Durable event rows carry delivery state, attempt counters, retry timing, and
  failure metadata.
- A background delivery loop claims pending events, projects notifications,
  marks the event delivered, and then publishes best-effort live updates.
- The delivery loop drains claimable batches before sleeping and is controlled
  by environment settings for enablement, batch size, poll interval, and
  processing lease age.
- Delivery health is exposed through a protected admin read endpoint so failed,
  pending, and stuck processing events are visible without direct database
  access.
- Notification projection remains idempotent through unique
  `user_notifications(user_id, event_id)` constraints.
- SSE is treated as a live convenience layer, not the source of truth. Durable
  notification rows are the primary user-facing projection.
- The first production hardening step uses an in-process polling loop. The
  design must preserve a path to move that loop into a dedicated worker later
  without changing domain producers.
- A dedicated worker entrypoint now runs the same delivery loop outside the HTTP
  API process. API nodes can disable local delivery with
  `PLATFORM_EVENT_DELIVERY_ENABLED=false`, while worker nodes enable it.

## Consequences

- Request handlers are less coupled to notification latency and transient
  projection failures.
- Stock transfer events can no longer be lost between a committed
  supply-request write and a separate post-commit event insert.
- Failed deliveries become observable and retryable from durable state.
- Event delivery is more resilient across restarts because pending events remain
  in Postgres.
- Backlog recovery is faster because the loop continues claiming available
  batches until no work remains.
- Operations can detect failed and stuck events through a contract-backed
  endpoint instead of relying on logs or manual SQL.
- Live delivery can tolerate best-effort failure without corrupting durable
  notification state.
- The delivery loop can now be deployed separately from the API.
- Split API/worker deployments still need replay-safe live delivery because the
  current SSE bus is process-local.
