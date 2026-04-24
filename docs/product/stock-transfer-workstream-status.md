# Stock Transfer Workstream Status

Last updated: 2026-04-20

This document is the handoff record for continuing the stock-transfer and
platform-event work in a new session.

## Scope

Primary backlog references:

- `E-02-01A` authorization hardening
- `E-02-01B` worker request-source eligibility
- `E-02-01C` operating location model
- `E-02-01D` transfer aggregate and append-only events
- `E-02-01I` transfer notifications and SSE integration
- platform event backbone from
  [ADR 0012](../architecture/adr/0012-platform-event-backbone.md)

Related ADRs:

- [ADR 0011](../architecture/adr/0011-stock-transfer-workflow-and-operating-scope.md)
- [ADR 0012](../architecture/adr/0012-platform-event-backbone.md)
- [ADR 0013](../architecture/adr/0013-platform-event-delivery-uses-a-durable-outbox-loop.md)

## Completed

### Authorization hardening

- Added request-level access policy enforcement for stock supply routes.
- Workers are restricted to creating requests only for destination locations in
  their operating scope.
- Workers can only confirm receipt for their own requests.
- Managers can only manage requests for source locations they control.
- GTN visibility is now tied to requester, involved manager, or admin access.
- Admin override support was added to request cancellation.

Implementation files:

- `apps/api/src/modules/stock/supply-request-access-policy.ts`
- `apps/api/src/modules/stock/supply-request.routes.ts`
- `apps/api/src/modules/stock/postgres-supply-request.repository.ts`
- `apps/api/src/index.ts`

### Worker request-source eligibility

- Added a destination-scoped source-location endpoint for workers.
- Removed the broad source-location picker behavior from the worker request
  flow.
- Worker request UI now handles loading, empty, and error states for eligible
  source locations.
- Worker and manager request cards show source and destination more clearly.

Implementation files:

- `packages/contracts/src/stock-supply.ts`
- `apps/api/src/modules/stock/supply-request.routes.ts`
- `apps/web/src/lib/react-query/stock-supply.ts`
- `apps/web/src/components/worker/stock/supply-request-dialog.tsx`
- `apps/web/src/components/worker/assignments/worker-assignments-page-client.tsx`
- `apps/web/src/components/worker/stock/worker-supply-requests-page-client.tsx`
- `apps/web/src/components/manager/stock/manager-supply-requests-page-client.tsx`

### Architecture and backlog records

- Added stock-transfer workflow and operating-scope ADR.
- Added platform-wide event backbone ADR.
- Added transfer workspace backlog decomposition.

Documentation files:

- `docs/architecture/adr/0011-stock-transfer-workflow-and-operating-scope.md`
- `docs/architecture/adr/0012-platform-event-backbone.md`
- `docs/product/stock-transfer-workspace-backlog.md`

### Platform event backbone first slice

- Added a shared platform-event abstraction and process-local event bus.
- Added an authenticated SSE endpoint at `/api/events/stream`.
- Added actor-and-permission-based event audience filtering.
- Wired stock supply mutations to publish transfer-domain events through the
  shared publisher.

Implementation files:

- `apps/api/src/modules/events/platform-event.types.ts`
- `apps/api/src/modules/events/in-memory-platform-event-bus.ts`
- `apps/api/src/modules/events/platform-event-access.ts`
- `apps/api/src/modules/events/platform-events.routes.ts`
- `apps/api/src/modules/stock/stock-supply-event-publisher.ts`
- `apps/api/src/server/create-server.ts`
- `apps/api/src/index.ts`
- `apps/api/src/modules/stock/supply-request.routes.ts`

### Durable event persistence and notification projection

- Added durable `platform_events`, `platform_event_audiences`, and
  `user_notifications` tables.
- Added notification query and read-state mutation APIs for authenticated users.
- Replaced placeholder shell notifications with backend-driven tray and
  notification-center pages.
- Added a notification projector that resolves recipients from direct-user and
  permission-scoped audiences.
- Generated database migration `0017_dazzling_giant_man.sql`.
- Generated database migration `0018_daffy_captain_cross.sql`.

### Durable outbox delivery loop

- Publishing now appends platform events durably and triggers a background
  delivery loop instead of projecting notifications inline in the request path.
- Added durable delivery state, retry metadata, and failure metadata to
  `platform_events`.
- Added a polling delivery loop that claims pending events, projects
  notifications, marks events delivered, and then emits best-effort live SSE
  events.
- Added notification center pages for admin, manager, worker, supplier, and
  agent portals.
- Corrected `0017_dazzling_giant_man.sql` so it only creates the platform event
  and notification objects it actually owns.
- Repaired local database migration drift where schema objects from
  `0014`-`0016` existed without corresponding rows in
  `drizzle.__drizzle_migrations`, then applied `0017` and `0018` cleanly.

Implementation files:

- `packages/database/src/schema/notifications.ts`
- `packages/database/drizzle/0017_dazzling_giant_man.sql`
- `packages/database/drizzle/0018_daffy_captain_cross.sql`
- `apps/api/src/modules/events/postgres-platform-event.repository.ts`
- `apps/api/src/modules/events/platform-event-pipeline.publisher.ts`
- `apps/api/src/modules/events/platform-event-delivery.service.ts`
- `apps/api/src/modules/events/platform-event-delivery-loop.ts`
- `apps/api/src/modules/notifications/postgres-notification-recipient.repository.ts`
- `apps/api/src/modules/notifications/postgres-user-notification.repository.ts`
- `apps/api/src/modules/notifications/notification.routes.ts`
- `apps/api/src/modules/notifications/notification-query.service.ts`
- `apps/api/src/modules/notifications/notification-write.service.ts`
- `apps/api/src/modules/notifications/platform-event-notification-projector.ts`
- `apps/web/src/components/providers/notification-live-provider.tsx`
- `apps/web/src/components/system/notification-center-page-client.tsx`
- `apps/web/src/components/system/portal-overlays.tsx`
- `apps/web/src/components/system/portal-topbar.tsx`
- `docs/architecture/platform-event-backbone-guide.md`

### Platform event production hardening

- Added environment controls for the event delivery loop:
  `PLATFORM_EVENT_DELIVERY_ENABLED`,
  `PLATFORM_EVENT_DELIVERY_BATCH_SIZE`,
  `PLATFORM_EVENT_DELIVERY_POLL_INTERVAL_MS`, and
  `PLATFORM_EVENT_DELIVERY_PROCESSING_LEASE_MS`.
- Updated the delivery loop to drain all claimable batches before sleeping so
  backlog recovery is not limited to one batch per poll interval.
- Added a protected admin endpoint at
  `GET /api/admin/platform-events/delivery-health` for pending, processing,
  delivered, failed, stuck-processing, and oldest-event delivery metrics.
- Added a public contract for the delivery-health response so future admin UI
  and operations checks have a stable payload.
- Added transaction-aware event append support and moved stock transfer
  mutations through the stock supply application service so the supply-request
  write and `platform_events` append commit or roll back together.
- Kept delivery triggering post-commit: transaction-aware append writes only the
  durable outbox rows, then notifies the delivery loop after commit.
- Added a dedicated platform event delivery worker entrypoint. Production can
  now run API instances with `PLATFORM_EVENT_DELIVERY_ENABLED=false` and run
  `pnpm --filter @shop/api events:worker` locally or
  `pnpm --filter @shop/api start:events` after build with delivery enabled.

Implementation files:

- `packages/contracts/src/platform-events.ts`
- `apps/api/src/env.ts`
- `apps/api/package.json`
- `apps/api/src/workers/platform-event-delivery-worker.ts`
- `apps/api/src/modules/events/create-platform-event-runtime.ts`
- `apps/api/src/modules/events/platform-event-pipeline.publisher.ts`
- `apps/api/src/modules/events/postgres-platform-event.repository.ts`
- `apps/api/src/modules/events/platform-event-delivery-worker-runtime.ts`
- `apps/api/src/modules/events/platform-event-delivery-loop.ts`
- `apps/api/src/modules/events/postgres-platform-event-delivery-health.repository.ts`
- `apps/api/src/modules/events/platform-event-delivery-health.service.ts`
- `apps/api/src/modules/events/platform-event-admin.routes.ts`
- `apps/api/src/modules/stock/stock-supply.service.ts`
- `apps/api/src/modules/stock/supply-request.routes.ts`
- `apps/api/src/server/create-server.ts`
- `apps/api/src/index.ts`

## Validation completed

The following commands passed after the latest supply-request changes:

- `pnpm --filter @shop/api exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @shop/api test`
- `pnpm --filter @shop/web exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @shop/web test`
- `pnpm guard:routes`

Additional validation completed after the platform-event slice:

- `pnpm --filter @shop/api exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @shop/api test`
- `pnpm --filter @shop/web exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @shop/web test`
- `pnpm --filter @shop/database db:generate`
- `pnpm --filter @shop/database test`

Additional validation completed after the event production-hardening slice:

- `pnpm --filter @shop/contracts test`
- `pnpm --filter @shop/api exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @shop/api test`
- `pnpm guard:routes`

Known guard status:

- `pnpm guard` is still blocked by pre-existing public `id` fields in:
  - `packages/contracts/src/catalog-variants.ts`
  - `packages/contracts/src/stock-supply.ts`
- `pnpm guard:routes` continues to pass after the event-route addition
- `pnpm guard:frontend` is still blocked by existing raw Tailwind palette and
  hardcoded color findings in manager, worker, and sales frontend files.
- `pnpm guard:file-length` is still blocked by existing large API and web files,
  including stock supply route/repository/service files and the notification
  center/portal overlay frontend files.

## Important findings still driving the work

- The current workflow is still centered on supply requests instead of a real
  transfer aggregate.
- Multi-location manager and admin operating context is still not explicit.
- The manager and worker transfer pages are still placeholders.
- The platform now has durable event storage, retryable delivery, notification
  APIs, frontend notification surfaces, environment-driven delivery controls,
  delivery-health visibility, and transactional stock-transfer event append,
  and a separately deployable delivery worker process.
- In split API/worker deployment, durable notifications still work, but live SSE
  invalidation remains process-local until replay-safe live delivery is added.
- Approval still does not create a source reservation or allocation.
- Advanced transfer behaviors are still missing:
  - partial receipt
  - discrepancy capture
  - post-dispatch exception handling
  - cancellation and reversal after approval or dispatch

## Next recommended implementation order

1. `E-02-01C`: explicit operating location model for managers and admin
   override mode
2. manager and admin transfer workspace UX
3. replay-safe live flow and failed-event replay for platform events
4. transfer aggregate and append-only transfer events
5. reservation and allocation on approval
6. migrate administration/access changes onto the platform event producer path

## Platform event backbone: current intended first slice

The first backend slice is now in place:

- shared event publisher abstraction under `apps/api/src/modules`
- process-local event bus implementation
- authenticated SSE delivery surface
- stock-transfer producer wiring
- generic event families such as:
  - `transfer.*`
  - `stock.*`
  - `assignment.*`
  - `delivery.*`
  - `notification.*`

The next step is to preserve the same interface while adding replay-safe live
delivery and failed-event replay controls.

## Known dirty-tree context

There were unrelated pre-existing edits in the worktree during the last
sessions, including:

- `apps/api/src/modules/stock/stock-supply.service.ts`
- `apps/web/src/components/system/portal-sidebar.tsx`

Treat those as external changes unless the new task explicitly requires
touching them.

## If resuming in a new session

Start by reading:

1. this file
2. [stock-transfer-workspace-backlog.md](./stock-transfer-workspace-backlog.md)
3. [ADR 0011](../architecture/adr/0011-stock-transfer-workflow-and-operating-scope.md)
4. [ADR 0012](../architecture/adr/0012-platform-event-backbone.md)
5. [ADR 0013](../architecture/adr/0013-platform-event-delivery-uses-a-durable-outbox-loop.md)

Then inspect:

- `apps/api/src/index.ts`
- `apps/api/src/modules/stock/supply-request.routes.ts`
- `apps/api/src/modules/stock/supply-request-access-policy.ts`
- `apps/api/src/modules/notifications/README.md`
- `apps/api/src/modules/events/platform-event-delivery.service.ts`

That is enough context to continue without re-discovering the earlier analysis.
