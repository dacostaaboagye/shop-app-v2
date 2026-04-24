# ADR 0011: Stock Transfers Use Scoped Operational Workflows

## Status

Accepted

## Context

The current stock movement workflow is split across `stock_supply_requests`,
goods transfer notes, worker screens, and manager screens that do not yet model
one operational transfer lifecycle.

That creates several architectural problems:

- authorization depends too much on route-level `any_active` permission checks
  and client-selected location context
- global admin behavior is inconsistent because UI location scopes are derived
  from assigned locations, while admin capability is broader than those scopes
- multi-location managers have no explicit operating context beyond one selected
  location at a time
- the existing request row is mutable operational state with no append-only
  transfer history
- the workflow does not model allocation, partial receipt, discrepancy, or
  exception handling
- client updates rely on polling and invalidation rather than transfer-domain
  events

The workbook and existing ADRs already require server-side authorization at
route boundaries, append-only history where accountability matters, and
reference-driven public interactions. Stock transfer operations need the same
level of rigor.

## Decision

- Stock movement between locations is treated as one transfer workflow, not as a
  loose combination of supply-request and GTN screens.
- A transfer may still begin as a worker request, but the primary domain concept
  is a `stock transfer` aggregate with:
  - source location
  - destination location
  - one or more line items
  - current operational status
  - summary references for request and shipment artifacts
- Transfer history is modeled through append-only transfer events. Mutable
  transfer summary rows may exist as projections, but state transitions must be
  reconstructable from the event stream.
- Server-side authorization for transfer actions is performed against the loaded
  transfer record, not only against route metadata or client-supplied location
  ids.
- The system distinguishes `operating location` from raw permission-assignment
  location scopes:
  - scoped workers operate only in explicitly assigned locations
  - managers may operate in one or more managed locations and need an explicit
    inbox or action context
  - admins may act globally, but override actions must still record an explicit
    acting context and reason
- The transfer lifecycle is expanded to operational states:
  - `draft` or `requested`
  - `reviewed`
  - `approved`
  - `allocated`
  - `picked`
  - `dispatched` or `in_transit`
  - `partially_received`
  - `received`
  - `cancelled`
  - `exception`
- Approval reserves or allocates source stock. Dispatch consumes that
  allocation. Receipt may be exact, partial, short, or exception-bearing.
- Worker, manager, and admin UI surfaces are separated by user journey:
  - worker: own requests and destination receipts
  - manager: managed-location inbox and dispatch actions
  - admin: cross-location control tower and override workflow
- Transfer updates consume the platform event backbone rather than introducing a
  transfer-specific realtime transport or event store.
- Transfer clients use server-sent events first. WebSockets are deferred until a
  truly bidirectional operational need exists.

## Consequences

- Existing supply-request and GTN screens are transitional and will be folded
  into a unified transfer workspace over time.
- Future transfer APIs must load the transfer first and authorize against the
  source and destination locations derived from that record.
- Transfer persistence will require additional append-only tables and projection
  logic rather than further expanding one mutable request row.
- Transfer notifications, activity entries, and live updates depend on the
  platform event backbone instead of a bespoke transfer-only pipeline.
- Admin UX must expose override intent explicitly instead of silently treating
  admin as a location-scoped manager.
- React Query invalidation can evolve from timer-driven polling toward
  domain-event-driven updates.
