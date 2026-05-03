---
id: E-04
title: Inventory tracking per location flow refinement
status: refined
source: "Building and Refining Product Backlog(2).xlsx / EPIC4"
last_reviewed: 2026-05-03
---

# E-04 Inventory Tracking Per Location

## Decision

E-04 should not be implemented as a generic stock table plus count modal. The
epic needs a domain-first inventory accountability flow, then a frontend stock
workspace redesign that exposes those semantics clearly.

The next implementation slice should tighten stock count and manual adjustment
semantics first. A full UI redesign should follow once the API can represent
opening counts, reason-coded corrections, stock-take references, thresholds,
and barcode lookup without frontend-only assumptions.

## Product Intent

Stakeholders need trusted SKU + location inventory so managers and workers can:

- seed opening stock by location
- view available stock where they operate
- correct discrepancies with auditable reasons
- conduct stock takes without hiding shrinkage or operational errors
- configure low-stock thresholds per SKU/location
- receive actionable low-stock alerts
- scan or enter barcode/SKU to confirm availability quickly

## Current Implementation Baseline

Already present:

- `stock_balances` is keyed by SKU + location and enforces nonnegative on-hand
  and reserved quantities.
- Admin, manager, and worker stock balance read APIs exist.
- Admin and manager count endpoints exist.
- Manager count writes re-check selected location permission at the API boundary.
- Admin and manager stock level screens exist.
- Variant barcode storage exists in catalog.
- The E-04-01 slice adds reason-coded count payloads, movement evidence, notes,
  previous/next quantity response context, and no-change responses.
- The admin stock levels page now exposes a location-scoped count workspace with
  server-backed product/SKU/barcode search, variant selection, current balance
  prefill, and direct SKU fallback through quick count.

Important gaps:

- Manager stock levels still need the same workspace treatment after the admin
  flow is accepted.
- Stock movements still have no stock-take reference or client idempotency key.
- Opening count is implicit instead of a clear business operation.
- Stock take sessions and line-level discrepancy evidence do not exist.
- Low-stock threshold persistence does not exist; current UI/backend logic uses
  hardcoded low-stock thresholds.
- Barcode lookup is only partially wired through admin catalog search; a
  dedicated permitted stock availability lookup remains future work.
- Product/variant selects are not suitable for high-volume inventory catalogs.
  Single-count flows should accept direct SKU/barcode entry, while large opening
  stock setup needs a dedicated guided or bulk workspace.

## Required Ticket Sequence

### E-04-00 Backlog Ticketing And Flow Design

Value: make E-04 executable by turning the epic into implementation tickets with
acceptance criteria, UAT, and dependency ordering.

Acceptance criteria:

- E-04 ticket sequence is captured in backlog working surfaces.
- Each ticket states stakeholder value, acceptance criteria, out of scope, and
  UAT evidence.
- Frontend redesign is represented as workflow redesign, not cosmetic polish.
- Domain/API dependencies are called out before UI-only work starts.

### E-04-01 Reason-Coded Stock Counts And Manual Adjustments

Value: managers can correct inventory while preserving accountability evidence.

Acceptance criteria:

- Admin or scoped manager with `inventory.write` can submit a stock count or
  adjustment for SKU + location only with a valid `reasonCode`.
- The API records actor, location, SKU, previous quantity, next quantity, delta,
  reason code, optional note, and timestamp.
- Manager writes outside their location scope are rejected with structured
  problem details and no stock changes.
- Counts that would reduce on-hand below reserved quantity are rejected without
  balance, movement, or event changes.
- Valid quantity changes update the balance and append movement/event evidence
  transactionally.
- No-op counts return a clear no-change result and do not create misleading
  adjustment movement rows.
- Contract, route, service/repository, event, and UI form tests cover success,
  reason validation, permission denial, reserved-stock conflict, and no-op.

UAT:

- Manager records a SKU count from 20 to 18 with reason `damaged`; stock shows
  18 and the movement/event shows actor and reason.
- Same manager attempts another location and is denied.
- Manager attempts to set on-hand below reserved quantity and receives a safe
  conflict; stock remains unchanged.
- Admin records opening stock for a new SKU/location and manager can view it.
- Repeating the same count reports no change and does not add movement noise.

### E-04-02 Opening Stock Setup Hardening

Value: managers can establish a trusted starting inventory baseline without
accidentally overwriting live balances.

Acceptance criteria:

- Opening stock is a distinct operation or reason class.
- Existing initialized balances cannot be silently overwritten through the
  opening flow.
- Bulk or guided setup supports large SKU/location inventories without missing
  products beyond the first page.
- Opening setup does not rely on modal product selects; it supports direct SKU
  entry, search, scanner input, or import-style bulk entry for 1000+ products.
- Evidence links opening stock to actor, timestamp, SKU, location, and source.

### E-04-03 Low-Stock Thresholds Per SKU/Location

Value: managers can define reorder/action points that reflect each location's
real operating needs.

Acceptance criteria:

- Thresholds are persisted at SKU + location level.
- Each location can have different thresholds for the same SKU.
- Reads include threshold-derived stock status.
- Current hardcoded frontend/backend low-stock thresholds are replaced or
  explicitly isolated behind a temporary shared constant.

### E-04-04 Low-Stock Alerts

Value: assigned workers and shop managers are notified before stockouts block
sales or operations.

Acceptance criteria:

- Threshold breach creates an actionable alert for the assigned worker and shop
  manager.
- Duplicate alert spam is prevented by a clear active-alert or dedupe rule.
- Recovery above threshold resolves or deactivates the condition.
- Alert payload uses SKU/location/product public identifiers, not raw internal
  IDs.

### E-04-05 Stock Take Sessions And Discrepancies

Value: managers can run controlled counts, preserve physical-vs-system
variance, and reconcile discrepancies without hiding loss or error.

Acceptance criteria:

- Stock take session and line records capture expected quantity snapshot,
  physical count, variance, counted by, reviewed by, and status.
- Applying a discrepancy uses the reason-coded adjustment path.
- Duplicate active stock takes for the same scope are prevented where needed for
  reconciliation.
- Completion preserves immutable evidence.

### E-04-06 Cross-Location Drilldown And Barcode Lookup

Value: managers and workers can quickly answer where a SKU is available and
whether a scanned item can be sold or moved.

Acceptance criteria:

- Barcode/SKU lookup returns the matching active variant and permitted stock
  availability.
- Manager cross-location views respect permission boundaries.
- Unknown or ambiguous barcodes return safe, actionable results.
- Responses use SKU, slugs, and approved references.

### E-04-07 Stock Levels UX Foundation

Value: stock pages become operational workspaces instead of static tables.

Acceptance criteria:

- Admin and manager stock list state is URL-owned for search, status, filters,
  page, and page size.
- Selecting "All" serializes as an empty filter and never sends `"all"` to stock
  APIs.
- Stock status is derived from one shared helper or contract-backed threshold
  value.
- Dashboard low/out-stock cards deep-link into filtered stock workflows.
- Admin and manager stock levels render desktop tables plus mobile stacked cards
  below `md`.
- Stock count forms use TanStack Form and shared field wrappers.
- Single-count forms use direct SKU/barcode entry instead of loading a paged
  product select.
- Visible submit buttons are disabled when invalid or pending.
- Safe mutation errors use shared problem-detail error surfaces.

## Frontend Findings To Carry Forward

- The current admin filter select can serialize `"all"` as a real slug, which
  can enable count entry against an invalid location filter.
- Count form currently uses manual `useState` field orchestration instead of
  TanStack Form. The E-04-01 admin form has been moved to TanStack Form; manager
  reuse should be confirmed in the next slice.
- Initial count product selection loads only the first 100 active products and
  has no direct SKU/barcode search path. The E-04-01 admin workspace replaces
  that with server-backed product/SKU/barcode search and paged results.
- Stock list screens use table-only layouts and need mobile stacked-card
  fallbacks for operational use.
- Low-stock thresholds are inconsistent between frontend helpers and backend
  summary logic.
- Dashboard low-stock links lose intent because they navigate to broad stock
  pages rather than pre-filtered risk views.

## Verification Notes

This refinement was produced through Codex role gates:

- Product Owner: value sequence and UAT
- Technical Lead / Backend / Database: domain model and API readiness
- Frontend Architect / UX: stock workspace interaction risks and redesign shape

E-04-01 implementation now includes the admin count workspace and reason-coded
count evidence. Remaining tickets should continue from the important gaps above.
