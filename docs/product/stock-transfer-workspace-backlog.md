# Stock Transfer Workspace Backlog

Backlog ticket: `E-02-01`

This document decomposes the workbook's transfer-related surface work into
repo-local execution slices so implementation can proceed with explicit evidence
and acceptance criteria.

## Current interpretation

`E-02-01` is not treated as a cosmetic portal page ticket. In this repo it is
the umbrella for stock transfer workflow, operating-scope UX, and transfer
visibility across worker, manager, and admin portals.

## Repo-local execution slices

### `E-02-01A` transfer policy hardening

Goal:
- enforce transfer visibility and actions from the backend against the loaded
  transfer or request record

Status:
- partially complete

Current evidence:
- worker and manager request routes use transfer-specific policy checks in
  `apps/api/src/modules/stock/supply-request-access-policy.ts`
- route tests cover worker scope, manager scope, admin override, and GTN
  visibility in `apps/api/test/supply-request.routes.test.ts`

Remaining acceptance:
- stock-assignment-adjacent transfer actions must be reviewed for the same
  resource-scope enforcement pattern
- admin override actions need explicit reason capture, not only broader access

### `E-02-01B` source-location eligibility and worker request entry

Goal:
- ensure workers can request transfers only for their operating destination
  location and only from eligible source locations

Status:
- partially complete

Current evidence:
- destination-scoped source-location endpoint exists at
  `/api/worker/stock/supply-request-sources`
- worker request dialog now loads eligible sources instead of the broad
  `/api/locations` list

Remaining acceptance:
- replace "all active locations except destination" with a real eligibility
  query once transfer-source rules are formalized
- prevent duplicate or overlapping requests for the same SKU and destination

### `E-02-01C` operating location model

Goal:
- separate raw permission-assignment scopes from the actor's chosen operating
  context in the UI

Status:
- in progress

Acceptance criteria:
- workers operate only in assigned locations
- managers with multiple locations get an "All my locations" inbox plus explicit
  action context
- admins can act globally or in an explicit override mode with recorded reason
- frontend location selection is derived from transfer-operating rules, not only
  from generic permission scope hooks

Production-readiness findings:
- see [production-readiness-findings.md](./production-readiness-findings.md)

Implementation notes:
- the first slice must introduce a typed operating-context model that separates
  global read context from location-bound action context
- admin list pages should default to global context and expose location filters
- manager and worker action pages should require a concrete selected location
- the active location store may remember the user's current selection, but it
  must not replace backend authorization or server-owned data

Current evidence:
- frontend operating-context resolver added in
  `apps/web/src/lib/authorization/operating-context.ts`
- existing permission-location hook now resolves through the typed operating
  context in `apps/web/src/lib/authorization/use-active-location-scope.ts`
- scoped pages now prefer the explicit `?location=` URL value and then sync the
  selected location back into the shared Zustand active-location store
- admin stock levels and reservations opt out of the topbar location selector
  because they are global admin list contexts with page-level location filters
- location detail staff links now route to the operational staff list and user
  profile pages instead of the access-control user pages
- resolver tests cover global, location-required, missing-location, and
  optional global-or-location behavior in
  `apps/web/src/lib/authorization/operating-context.test.ts`
- admin stock filter tests cover global defaults and explicit location filters
  in `apps/web/src/app/admin/stock/balances/page.support.test.ts`

### `E-02-01D` transfer aggregate and append-only events

Goal:
- replace the thin mutable request flow with a transfer aggregate and
  append-only transfer-event history

Status:
- pending

Acceptance criteria:
- transfer summary row and transfer-event ledger coexist with reconstructable
  state transitions
- one transfer may contain one or more line items
- lifecycle includes request, approval, allocation, dispatch, receipt, cancel,
  and exception transitions
- request and GTN references become related artifacts, not disconnected primary
  workflow records

### `E-02-01E` source allocation and reservation

Goal:
- stop over-promising approved stock by reserving or allocating source quantity
  during approval

Status:
- pending

Acceptance criteria:
- approval creates or updates source allocation
- dispatch consumes allocation instead of re-deriving availability late
- cancellation and exception flows release or reverse allocation correctly

### `E-02-01F` worker transfer workspace

Goal:
- give workers one coherent journey from low stock to receipt confirmation

Status:
- partially complete

Current evidence:
- worker assignment page can open the transfer request dialog
- worker request page now shows clearer route context and `In transit` state

Remaining acceptance:
- worker sees only own requests in a dedicated transfer workspace
- timeline shows source, destination, approved quantity, GTN, age, and last
  event
- receipt flow supports discrepancy reporting and partial receipt outcomes

### `E-02-01G` manager transfer inbox

Goal:
- replace the current single-location request list with a managed transfer inbox

Status:
- pending

Acceptance criteria:
- manager sees transfers across all managed source locations
- inbox supports lanes such as `Needs review`, `Allocated`, `In transit`,
  `Exceptions`, and `Completed`
- action buttons are available only in a valid operating context
- cards and detail views show requester, source, destination, quantities, GTN,
  age, and last event

### `E-02-01H` admin control tower

Goal:
- provide a cross-location transfer surface for monitoring, intervention, and
  override actions

Status:
- pending

Acceptance criteria:
- admin can filter globally or by location
- override mode is explicit and reason-bearing
- bottlenecks, ageing transfers, and exception states are visible centrally
- admin sees the same transfer truth as worker and manager views, not a separate
  shadow flow

### `E-02-01I` transfer notifications and SSE integration

Goal:
- move transfer updates from polling toward event-driven UI refresh using the
  shared platform event backbone

Status:
- partially complete

Current evidence:
- transfer module emits transfer-domain events through the shared platform event
  backbone
- authenticated SSE stream exists and filters live events by actor audience
- notification APIs exist for list, mark-one-read, and mark-all-read
- portal shell now uses backend-driven notification tray data and notification
  center pages
- web app invalidates notification queries when live platform events arrive

Acceptance criteria:
- transfer module emits transfer-domain events through the shared platform
  outbox or event publication path
- server-sent events stream is filtered by actor and location scope
- frontend invalidates affected React Query keys from event payloads
- notification tray and activity surfaces consume the same event stream

Remaining acceptance:
- add query invalidation targeted by event payload and affected resource, not
  notification-list invalidation only
- add replay-safe live delivery and notification pagination
- add deep links from notification rows into the relevant workflow detail pages

Platform dependency:
- this slice depends on a platform-wide event backbone rather than a
  transfer-only realtime implementation

## Cross-cutting prerequisite

### Platform event backbone

This transfer backlog depends on a shared operational event backbone described
in ADR 0012.

That platform backbone should support:

- domain event publication through a shared outbox pattern
- permission-aware SSE fan-out
- notification and activity-feed consumers
- future reuse by stock, assignment, handover, delivery, and access workflows

## Recommended implementation order

1. `E-02-01C` operating location model
2. `E-02-01G` manager transfer inbox
3. `E-02-01H` admin control tower
4. `E-02-01D` transfer aggregate and append-only events
5. `E-02-01E` source allocation and reservation
6. `E-02-01F` worker receipt and discrepancy workflow expansion
7. platform event backbone
8. `E-02-01I` notifications and SSE integration

## Definition-of-done evidence for the umbrella ticket

`E-02-01` should not be treated as complete until all of the following exist:

- backend transfer actions authorize against loaded transfer records
- worker, manager, and admin views reflect the same transfer lifecycle
- multi-location manager context is explicit
- admin override actions are explicit and auditable
- transfer state can be explained from append-only events
- transfer updates reach clients without relying only on polling
