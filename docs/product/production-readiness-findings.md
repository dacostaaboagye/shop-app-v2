# Production Readiness Findings

Last updated: 2026-04-22

This document records the current production-readiness findings from the
operations, staff, stock, sales, supplier, document, and notification surfaces.
It is intentionally implementation-facing: each finding should either map to an
existing backlog slice or become one before work starts.

## Main Findings

### Operating Location Is Not Yet First-Class

Current symptoms:

- managers can have a location active in the header while page-level selectors
  or requests disagree
- admin pages sometimes behave like the admin must be attached to a location
- worker, manager, and admin pages each decide location context slightly
  differently

Root cause:

- location selection is derived from generic permission-location scopes instead
  of a typed operating context
- the system does not consistently distinguish global read context from
  location-bound action context
- persisted location state previously won over the URL location, so scoped pages
  could show one active location while requests were resolved against another

Backlog owner:

- `E-02-01C` operating location model

Definition of done:

- workers operate only in assigned locations
- managers can switch between assigned locations and, where useful, see an
  "all managed locations" inbox
- admins can read globally by default and must choose an explicit location for
  location-bound actions
- frontend location selection has one client-side source of truth
- page URL location selection updates the global active-location store instead
  of being overwritten by stale persisted state
- scoped pages now prioritize the global active-location store over stale URL
  parameters and then rewrite the URL to match the selected operating location
- backend still authorizes every action from server-side permissions and loaded
  resource state

### Admin Global Workflows And Scoped Workflows Are Mixed

Current symptoms:

- global stock levels, reservations, staff, sales, and operations flows do not
  always make clear whether they are global or location-scoped
- admin functionality can be blocked by pages expecting a location-attached user
- filtered global reservation views can lose the selected location context when
  the result set is empty

Root cause:

- several UI screens reuse manager/worker assumptions instead of having explicit
  `global` and `location` modes
- some list responses inferred scope labels from returned rows rather than from
  the selected filter scope

Definition of done:

- admin list pages default to global data with optional location filters
- manager/worker pages require a selected operating location where the action is
  location-bound
- managers can manually count stock only through a manager-scoped endpoint that
  re-checks `inventory.write` against the selected location before writing
- global admin Supply stock/reservation sidebar entries are visible only to the
  admin portal permission, so location managers are directed to their scoped
  Operations stock and supply-request pages instead of admin-only APIs
- managers have a scoped reservation page and API for active reservations at
  the selected operating location, with backend permission checks against that
  location
- shared components receive explicit scope props rather than inferring role
  behavior internally
- filtered admin stock/reservation responses preserve selected location context
  even when no rows match

### Stock Transfer Is Still Centered On Supply Requests

Current symptoms:

- in-transit stock is not consistently visible in stock management
- approval does not reserve or allocate source stock
- cancellation, dispatch, receipt, and exception handling are too thin for real
  operations

Root cause:

- supply requests and GTNs are transitional artifacts, but there is no transfer
  aggregate or append-only transfer event ledger yet

Backlog owner:

- `E-02-01D` transfer aggregate and append-only events
- `E-02-01E` source allocation and reservation

Definition of done:

- transfer lifecycle is visible from one transfer truth
- approval allocates source stock
- dispatch moves quantity into in-transit state
- receipt reconciles exact, partial, and exception outcomes
- transfer history is explainable from append-only events

### Official Documents Have Multiple Rendering Paths

Current symptoms:

- template previews and generated PDFs can drift
- GTNs and sales documents can accidentally inherit each other's layout or
  wording
- generated documents can miss business-specific fields
- brand, currency, and location document setting changes need durable
  operational evidence for admins and affected managers
- issued invoices, credit notes, and GTNs need event evidence when the immutable
  document snapshot is first created

Root cause:

- the document settings preview, frontend HTML helpers, and backend PDFKit
  renderers are not yet driven by one shared document layout contract
- document settings writes were persisted but not projected into the platform
  event/notification path
- issued document snapshots were immutable but not projected into the platform
  event path

Backlog owner:

- `E-02-01J` official documents workstream

Definition of done:

- sales receipts, credit notes, and GTNs render from typed document DTOs
- settings template preview and generated PDF consume the same document model
- generated documents use resolved brand profile, uploaded logo, colors,
  currency, legal identity, and document evidence consistently
- global and location document setting changes publish operator-readable
  platform events with actor, changed sections, scope, and affected location
- newly issued immutable document snapshots publish one idempotent
  `documents.issued` event; repeated views/downloads reuse the snapshot without
  creating duplicate events

### Money And Currency Are Not Fully Persisted Per Transaction

Current symptoms:

- sales and history needed currency display fixes page by page
- future ecommerce and customer-portal invoices will require stable historical
  currency behavior
- worker POS product selection needs tested filtering by brand, category, and
  search so large assignment lists remain usable

Root cause:

- amounts are still mostly fixed-scale strings, while invoice-level currency
  snapshots are not fully modeled as first-class persisted data
- sales UI filtering was implemented locally and needs reusable, tested query
  support as the sales surfaces grow

Definition of done:

- invoices, credit notes, and future ecommerce sales persist currency code and
  scale snapshots
- backend owns calculations and rounding
- frontend only formats already-calculated amounts
- POS assignment selection exposes product images and tested category, brand,
  and text filtering

### People Media Is Part Of Operational Identity

Current symptoms:

- staff, worker assignment, and access-management screens could identify people
  only by text even though the media system already supports user images
- image handling was inconsistent across people surfaces

Root cause:

- user primary media was projected on some admin user queries but not on
  location staff or manager staff payloads
- people UI surfaces did not share a reusable avatar/preview pattern

Backlog owner:

- `E-02-01K` people media consistency

Definition of done:

- user-backed staff DTOs include `primaryImageUrl`
- people lists and worker selectors show the uploaded user image when present
- standalone people images use the shared full-image preview behavior
- controls that are already buttons render a non-interactive avatar to avoid
  nested interactive elements

### Suppliers Are Still User-Role Based

Current symptoms:

- supplier organizations and contacts now exist separately from login users
- supplier catalogue relationships, procurement documents, and supplier portal
  onboarding still need follow-on slices
- supplier contacts can link to portal users, but a supplier is no longer
  treated as the same thing as a user account

Root cause:

- supplier was initially treated mainly as a portal role, not as a domain entity
- the domain model now has a supplier organization foundation, but operational
  workflows still need to move onto that foundation

Definition of done:

- supplier profiles exist separately from login users
- supplier users can be contacts under supplier profiles
- supplier list pages query supplier entities, not all users with a supplier
  role
- supplier creation, contact management, catalogue linkage, purchase terms, and
  procurement-document flows use supplier IDs as the domain anchor

### Audit And Notifications Are Not Broad Enough

Current symptoms:

- important business actions do not consistently appear in audit logs or
  descriptive notifications
- notifications can be technically correct but not human-readable enough for
  operations
- transfer notifications were reference-only summaries instead of explaining
  product, SKU, quantity, source, destination, and GTN context

Root cause:

- platform events are in place, but many modules have not moved their business
  actions onto the durable event path
- transfer event summaries were duplicated across code paths instead of using a
  shared formatter

Definition of done:

- settings, catalog, stock count, transfer, sales return, document issue,
  assignment, supplier, and access changes publish durable events
- manual stock counts publish `stock.count.updated` events only when a real
  quantity change is recorded
- notifications are projected from events with operator-friendly copy and deep
  links
- audit records include actor, action, target, location context, and reason
  where applicable
- transfer event summaries are generated from one tested formatter and include
  enough business context to act without opening the record first

## Recommended Implementation Order

1. `E-02-01C`: operating context and active-location model
2. admin global stock levels, reservations, staff, sales, and operations UX
3. manager/worker scoped workflow fixes using the operating-context foundation
4. transfer aggregate and in-transit/allocation model
5. official document DTO/layout unification
6. per-transaction money and currency snapshots
7. supplier domain model
8. platform-wide audit/event coverage and human-readable notifications

## Production Rule

Do not mark a slice complete until every acceptance criterion has evidence in
code, tests, and docs. Avoid moving to the next slice while the current slice
still has known failing endpoints, missing permissions, or incomplete empty,
loading, and error states.
