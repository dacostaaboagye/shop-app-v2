# Production Readiness Findings

Last updated: 2026-04-26

This document records the current production-readiness findings from the
operations, staff, stock, sales, supplier, document, and notification surfaces.
It is intentionally implementation-facing: each finding should either map to an
existing backlog slice or become one before work starts.

## Main Findings

### Frontend System Quality Is Not Yet Enforced End To End

Current symptoms:

- design-system usage is inconsistent across portals and page families
- some screens still expose technical or low-value information to users
- money, quantity, status, and date rendering are not uniformly standardized
- native browser date inputs are still present in parts of the app instead of
  using the shared date-picker or date-range primitives
- resilience, accessibility, responsiveness, and content-growth handling are
  uneven across the app
- testing environment exposed backend request IDs directly in normal user error
  cards

Root cause:

- the frontend grew through delivery slices without one enforced rewrite plan
- semantic tokens exist, but runtime brand mapping and shared display rules are
  not yet the only supported path
- shared error rendering still treats internal request references as normal
  user-facing content

Backlog owner:

- `FE-01` frontend overhaul workstream

Definition of done:

- all rewritten screens follow one shared system for layout, formatting, and
  resilience
- design tokens resolve from a constrained runtime brand-theme map
- internal request IDs and similar support/debug references are hidden from
  normal user-facing production UI by default
- money, quantity, date, and status presentation uses shared helpers
- all date and date-range inputs use shared shadcn-based picker primitives
  instead of native browser date fields
- content growth is handled intentionally across narrow and wide layouts
- rewritten pages satisfy accessibility, responsiveness, and performance checks

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
- worker supply requests are still single-item oriented, which forces repeated
  request creation when several variants need replenishment together

Root cause:

- supply requests and GTNs are transitional artifacts, but there is no transfer
  aggregate or append-only transfer event ledger yet

Backlog owner:

- `E-02-01D` transfer aggregate and append-only events
- `E-02-01E` source allocation and reservation

Definition of done:

- transfer lifecycle is visible from one transfer truth
- workers and managers can create one supply request containing multiple
  requested variants with one shared operational context and notes
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
- there is no bulk print workflow for generating a date-range booklet of issued
  documents for printing or archive review
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
- admins and managers can select a permitted date range and generate one
  ordered booklet file for the matching issued documents in that scope
- global and location document setting changes publish operator-readable
  platform events with actor, changed sections, scope, and affected location
- newly issued immutable document snapshots publish one idempotent
  `documents.issued` event; repeated views/downloads reuse the snapshot without
  creating duplicate events

### Email Delivery Is Still Split Across Auth And Admin Paths

Current symptoms:

- auth emails and supplier/admin emails are not guaranteed to use the same
  template, brand, and sender resolution path
- preview and live send can diverge on visible sender details
- email infrastructure lives mostly under the auth module even though it now
  supports supplier and platform workflows too
- admins do not yet have one governed compose/send workflow for operational
  outbound email
- the system records delivery attempts but does not yet expose a production
  operator surface for test-send, provider mode, or delivery diagnostics
- current templates render acceptably, but they still need stronger
  email-client-safe layout constraints, dark-mode resilience, better mobile
  spacing checks, and separately-reviewed plain-text copy

Root cause:

- email delivery started as an auth helper instead of a first-class messaging
  capability
- auth runtime and admin directory runtime construct email services through
  separate paths
- rendered email HTML, sender semantics, and preview configuration are not yet
  driven by one dedicated messaging configuration runtime

Progress since this finding was opened:

- auth, admin directory, and messaging operations now share one configured
  `EmailService` instance in the main API runtime
- immediate provider send failures now publish durable
  `messaging.email.failed` platform events
- preview/live-send parity is covered for password reset and email verification
- auth recovery, supplier portal invite, admin test-send, and blocked-recipient
  checks now have focused route/service evidence
- recipient-state diagnostics and send-disable behavior are shared across admin
  email operations and supplier portal invite controls
- operator-visible recent-attempt coverage now includes delayed and failed
  lifecycle states

Remaining production gap:

- manual desktop/mobile mail-client checks still need to be recorded before
  this finding can be closed
- generated review fixtures and the release checklist now exist under:
  - `docs/product/evidence/email-template-review-fixtures/*`
  - [email-template-client-review.md](./email-template-client-review.md)

Backlog owner:

- `E-03-05B` email reliability foundation

Definition of done:

- all transactional email delivery runs through one dedicated messaging module
- auth, supplier, and future platform emails resolve brand, sender, and
  template data through one configuration runtime
- preview and live send use the same resolved configuration model
- sender semantics are explicit: `from`, `replyTo`, display brand, and business
  contact are separate fields where needed
- HTML templates are hardened for major email clients, dark mode, and mobile
  spacing
- focused tests prove mobile header/CTA stacking and safer long-content
  handling for brand names, support addresses, CTA labels, and fallback links
- plain-text templates are reviewed as first-class outputs instead of being
  derived as an afterthought
- admins can send a test email, inspect recent delivery attempts, and see
  whether the system is in live-send or console-fallback mode
- admins can send governed operational outbound emails through the same
  messaging runtime, with template/source/audit evidence
- provider failures, missing configuration, and delivery-state mismatches are
  visible through structured diagnostics

### Money And Currency Are Not Fully Persisted Per Transaction

Current symptoms:

- future ecommerce and customer-portal invoices will require stable historical
  currency behavior
- worker POS product selection needs tested filtering by brand, category, and
  search so large assignment lists remain usable

Root cause:

- invoice-level currency snapshots were missing from the sales aggregate and had
  to be inferred from surrounding settings and UI behavior
- sales UI filtering was implemented locally and needs reusable, tested query
  support as the sales surfaces grow

Progress since this finding was opened:

- POS invoices and credit notes now persist `currencyCode` and `currencyScale`
  from the resolved document profile at write time
- return flows now carry the parent invoice currency snapshot forward instead of
  re-resolving currency from current settings
- public invoice responses now expose the persisted invoice currency snapshot
  instead of forcing callers to infer it elsewhere
- issued sales-document snapshots now force profile currency to the persisted
  invoice currency snapshot instead of current settings currency
- focused sales service evidence now covers:
  - custom price rounding
  - invalid custom-price fallback to catalog price
  - return total calculation from original unit price
- focused route and document evidence now covers:
  - sales history/detail currency fields
  - issued sales snapshot currency fields
  - sales receipt and credit-note PDF fixture coverage
  - credit-note title and negative money formatting in document rendering

Remaining production gap:

- future non-POS sales channels still need the same currency-snapshot treatment
  when they are brought into Wave 1 or later production scope

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

Progress since this finding was opened:

- manager staff and admin location staff route coverage now proves
  `primaryImageUrl` is exposed in operational staff payloads
- worker assignment and POS selection surfaces consume `primaryImageUrl` and
  fall back to initials when no uploaded image exists
- button-based worker selectors now have focused UI evidence proving images are
  rendered through non-interactive avatars instead of nested interactive image
  previews
- admin location staff rows, manager staff rows, and access-summary people
  surfaces now have focused UI evidence proving uploaded user images render
  through the shared avatar path with initials fallback when absent
- standalone user-profile identity media now has focused UI evidence proving
  uploaded people images render through the shared full-image preview behavior

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
- supplier enquiries, product proposals, reusable pricing, quotes, purchase
  orders, and price-change reviews are still not modeled as a complete
  procurement lifecycle

Root cause:

- supplier was initially treated mainly as a portal role, not as a domain entity
- the domain model now has a supplier organization foundation, but operational
  workflows still need to move onto that foundation
- supplier communication and pricing were initially modeled as fields on
  supplier records instead of their own audited lifecycles

Definition of done:

- supplier profiles exist separately from login users
- supplier users can be contacts under supplier profiles
- supplier list pages query supplier entities, not all users with a supplier
  role
- supplier creation, contact management, catalogue linkage, purchase terms, and
  procurement-document flows use supplier IDs as the domain anchor
- supplier/admin conversations are two-way thread-backed records with message
  attachments and edit history
- suppliers can propose new goods that are not yet in the catalog
- suppliers can maintain reusable offer/pricing records for the SKUs they supply
- quote requests prefill from supplier offers or previous quotes
- accepted quotes snapshot into purchase orders
- supplier price changes notify admins and require review before internal cost
  prices change
- supplier invite, quote, purchase-order, and price-review notifications have
  in-app and reliable email delivery paths

Planning references:

- [supplier-procurement-workstream-plan.md](./supplier-procurement-workstream-plan.md)
- [ADR 0015](../architecture/adr/0015-supplier-procurement-and-conversation-lifecycle.md)

### Audit And Notifications Are Not Broad Enough

Current symptoms:

- important business actions do not consistently appear in audit logs or
  descriptive notifications
- notifications can be technically correct but not human-readable enough for
  operations
- transfer notifications were reference-only summaries instead of explaining
  product, SKU, quantity, source, destination, and GTN context
- users do not yet have notification sound controls, delivery preferences, or a
  dedicated account-management surface for future account activity
- admins do not yet have one audited path for sending in-app notifications to
  users or operational groups

Root cause:

- platform events are in place, but many modules have not moved their business
  actions onto the durable event path
- transfer event summaries were duplicated across code paths instead of using a
  shared formatter
- user-facing notification management has not yet been modeled as part of the
  account domain

Progress since this finding was opened:

- stock counts, transfer lifecycle actions, official-document setting changes,
  and issued-document snapshots already publish durable platform events
- catalog brand, category, product, and variant create/update writes now
  publish operator-readable durable events with slug/name/status context
- catalog brand, category, product, and variant deletes now publish
  operator-readable durable events with relevant business context
- supplier portal contact lifecycle now publishes operator-readable durable
  events for:
  - portal link
  - portal invite
  - portal unlink
- supplier product relationship changes now publish operator-readable durable
  events for:
  - product link
  - product unlink
- supplier procurement lifecycle now publishes operator-readable durable events
  for:
  - purchase-order creation
  - purchase-order status updates
  - goods receipt recording
- assignment lifecycle writes now publish operator-readable durable events for:
  - assignment creation
  - reassignment
  - handover start
  - handover revert
- sales return processing now publishes operator-readable durable events with:
  - credit-note reference
  - parent invoice reference
  - location context
  - return reason
  - historical currency/total context
- access role create/update writes now publish operator-readable durable events
- admin user-access mutations now publish operator-readable platform events for:
  - role assignment
  - role revocation
  - permission override set/remove
  - profile update
  - status update
  - forced password-reset requirement

Definition of done:

- settings, catalog, stock count, transfer, sales return, document issue,
  assignment, supplier, and access changes publish durable events
- manual stock counts publish `stock.count.updated` events only when a real
  quantity change is recorded
- notifications are projected from events with operator-friendly copy and deep
  links
- users can manage notification preferences, including sound and delivery
  behavior, from an account-management surface that is ready for future account
  activity features
- admins can send audited in-app operational notifications through a governed
  compose flow, and that compose path can also delegate to governed outbound
  email where allowed
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
6. dedicated messaging/email runtime and diagnostics
7. per-transaction money and currency snapshots
8. supplier domain model
9. platform-wide audit/event coverage and human-readable notifications
10. multi-item supply request workflow
11. admin outbound email and in-app notification compose path
12. account management and per-user notification preferences
13. shared date-picker/date-range replacement for native date inputs
14. bulk issued-document booklet generation by date range

## Production Rule

Do not mark a slice complete until every acceptance criterion has evidence in
code, tests, and docs. Avoid moving to the next slice while the current slice
still has known failing endpoints, missing permissions, or incomplete empty,
loading, and error states.
