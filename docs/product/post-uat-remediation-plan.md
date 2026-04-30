# Post-UAT Remediation Plan

Last updated: 2026-04-28

Backlog umbrella: `UAT-01`

## Goal

Convert the latest stakeholder feedback into repo-local delivery slices that
fit the current architecture, preserve the shared API and document contracts,
and expose the invoice workflow gaps that need explicit architectural work.

## Current State Summary

### What already exists

- Sales list endpoints already support server pagination plus basic date and
  document-type filtering through `packages/contracts/src/sales.ts`,
  `apps/api/src/modules/sales/postgres-invoice-query.repository.ts`, and
  `apps/web/src/lib/react-query/pos-sales.ts`.
- Worker and manager invoice detail pages already use the official document
  workspace and immutable issued-document snapshots from
  `apps/web/src/components/worker/sales/invoice-detail-page-client.tsx`,
  `apps/web/src/components/manager/sales/manager-invoice-detail-page-client.tsx`,
  and `docs/product/official-documents-workstream-status.md`.
- Returns already create a credit note tied to the original invoice through
  `parentInvoiceId` in `packages/database/src/schema/sales.ts` and
  `apps/api/src/modules/sales/postgres-invoice-return.commands.ts`.

### What is missing relative to the feedback

- Invoice search does not support customer-name lookup, reference search, amount
  filtering, or invoice classification filters.
- Invoice detail responses do not expose document-chain metadata such as
  original invoice, linked credit notes, or adjusted replacement invoices.
- The current return workflow ends at credit-note issuance. It does not create a
  final adjusted invoice or mark the original invoice as revised/superseded.
- The worker dashboard is operational but not analytical. It surfaces counts and
  shortcuts rather than KPI and trend visualizations.
- Manager sales history uses a list-style ledger rather than a scalable,
  URL-synced filter and table workflow.
- Tracker and product-list filtering is inconsistent across screens.
- The feedback about the portal shell reloading after login suggests an auth or
  portal-routing transition defect that still needs explicit reproduction and
  isolation.

## Non-Negotiable Constraints

- Public API responses must keep using approved public references or UUIDs, not
  raw surrogate IDs.
- Permissions stay enforced at the API boundary, including invoice search,
  document linking, and document download.
- Audit-sensitive document history should follow the repo's append-only
  direction from `docs/architecture/adr/0003-append-only-ledgers.md`.
- Significant invoice-workflow changes require an ADR before or during
  implementation because they alter financial-document lifecycle semantics.

## Architectural Decision Required

### Adjusted invoice and document-chain model

The current schema only models a simple parent link from credit note to invoice.
That is insufficient for the required lifecycle:

`Invoice A -> Credit Note -> Invoice B`

Required repo-level decision:

- add a document-chain model that can represent:
  - original invoice
  - credit note
  - adjusted replacement invoice
  - repeated return/revision cycles
- preserve immutable issued documents while making the latest valid payable
  state explicit
- expose chain visibility on every document detail response

Recommended direction:

- keep each financial document immutable after issuance
- introduce append-only link or revision records rather than mutating history
- extend invoice status/lifecycle semantics to include a revised or superseded
  state for the original invoice while keeping the document snapshot intact
- add a clear "current payable document" concept so reporting and UI do not
  infer truth from ad hoc calculations

This is now captured in
`docs/architecture/adr/0020-sales-document-revision-lifecycle.md`. Backend and
frontend implementation should follow that lifecycle model rather than
extending the current one-link credit-note flow.

## Workstream Slices

### `UAT-01A` shared filter and search foundation

Goal:
- standardize URL-synced filtering, search, sorting, and pagination patterns
  across tracker, product, and invoice list surfaces

Deliverables:
- shared query-param helpers for list pages where missing
- server-backed filter contracts for invoice and tracker screens
- consistent reset/clear behavior
- page reset to `1` on filter changes

Acceptance criteria:
- list pages keep filter state in the URL
- text search is debounced
- discrete filters update immediately
- pagination is always server-driven
- loading, empty, and error states remain present on all updated screens

### `UAT-01B` tracker and product-list UX cleanup

Goal:
- fix inconsistent filtering and cluttered supply-request or tracker card
  composition

Deliverables:
- tracker filters for status, date, category, and user where business-valid
- aligned product-list filtering behavior across the relevant contexts
- redesigned supply-request cards using existing system and shadcn patterns

Acceptance criteria:
- multi-filter workflows work without manual page refresh
- filters can be cleared in one action
- mobile and desktop layouts remain readable
- the updated cards follow `docs/frontend/design-system.md`

### `UAT-01C` worker dashboard analytics

Goal:
- turn the worker dashboard from a shortcut page into an insight surface

Deliverables:
- KPI summary cards with business-significant metrics
- daily and weekly sales trend visualization
- removal or reduction of duplicated low-value content

Acceptance criteria:
- the dashboard answers "how am I doing today" at a glance
- charts degrade safely for empty and sparse data
- every async dashboard panel has loading, empty, and error states

### `UAT-01D` invoice search, classification, and scalable table view

Goal:
- make invoice retrieval usable at operational scale

Deliverables:
- customer-name, reference, and date search/filter support
- type/status/classification filters
- amount range filters if business confirms they are required
- structured table view using `AppDataTable`
- URL-synced server pagination

Acceptance criteria:
- users can filter invoices by `internal` vs `outgoing`
- users can search by customer name and public reference
- large result sets stay performant through server pagination
- manager, admin, and worker surfaces each enforce their own permission scope

Implementation note:
- this slice likely requires extending `packages/contracts/src/sales.ts`,
  `apps/api/src/modules/sales/postgres-invoice-query.repository.ts`, and the
  relevant sales history clients in `apps/web`.

### `UAT-01E` invoice and credit-note adjustment workflow

Goal:
- implement the complete financial revision lifecycle for partial returns

Deliverables:
- return flow that issues a credit note and a final adjusted invoice
- explicit lifecycle state for superseded or revised originals
- support for multiple return cycles without losing history
- backend tests for single return, partial return, repeated return, and
  over-return rejection

Acceptance criteria:
- original invoice remains viewable but is no longer treated as the final truth
- credit note always references the original invoice
- adjusted invoice is generated automatically from the remaining valid items
- every document exposes the related chain from any entry point
- reporting uses the adjusted payable state consistently

Required evidence:
- schema and contract changes
- service and repository tests
- route tests
- updated detail UI and official-document rendering behavior
- ADR for the lifecycle model

### `UAT-01F` document visibility and linking

Goal:
- make related-document navigation obvious in the UI and printable documents

Deliverables:
- related-documents panel on invoice and credit-note detail pages
- chain metadata in invoice response contracts
- printable or PDF document metadata that states origin and linked references

Acceptance criteria:
- users can navigate from original invoice to credit note to adjusted invoice
- document relationships are visible without manual reconciliation
- access checks still apply to each linked document

### `UAT-01G` post-login shell stability

Goal:
- remove unexpected shell reloads and stabilize portal entry transitions

Deliverables:
- reproducible failing scenario
- isolated auth, portal-routing, or hydration cause
- fix with regression coverage if the defect is code-driven

Acceptance criteria:
- login transitions into the target portal without unnecessary full reload
- portal state persists appropriately through the initial shell render
- multi-portal selection and switching behavior remain correct

### `UAT-01H` reporting and dashboard data model expansion

Goal:
- support chart-ready aggregated metrics rather than forcing dashboards to
  derive trends from raw lists in the browser

Deliverables:
- backend summary endpoints for daily sales, weekly trend, and return pressure
- shared contract types for KPI and chart data
- permission-scoped aggregation queries

Acceptance criteria:
- dashboards fetch summary data directly
- aggregation queries do not require the frontend to download full invoice
  histories for simple charts
- summary endpoints obey location and role scope

## Recommended Implementation Order

1. `UAT-01E` ADR for adjusted invoice lifecycle and document chaining
2. `UAT-01D` invoice search and classification query-model expansion
3. `UAT-01F` document visibility and linking
4. `UAT-01H` reporting and summary endpoints
5. `UAT-01C` worker dashboard analytics
6. `UAT-01A` shared filter and pagination foundation where still missing
7. `UAT-01B` tracker and product-list UX cleanup
8. `UAT-01G` shell reload investigation and fix

## Why This Order

- The invoice workflow is the highest business-risk item and changes both data
  semantics and document truth.
- Search, classification, and linking depend on the revised invoice model.
- Dashboard value improves once summary endpoints exist instead of relying on
  client-side reconstruction.
- Tracker and product-list filtering are important UX issues but lower risk than
  financial-document correctness.
- The login reload issue is important for polish and trust, but it does not
  block the financial-audit remediation path.

## Definition Of Done For `UAT-01`

- stakeholder feedback items are mapped to closed delivery slices with code and
  test evidence
- invoice workflows support auditable partial-return revision chains
- linked-document visibility exists in both API response shape and frontend
  detail views
- invoice classification is explicit and reportable
- updated list screens use URL-synced filters and server pagination
- dashboard surfaces expose meaningful KPI and trend data
- the post-login reload defect is reproduced, fixed, and regression-tested or
  explicitly ruled out with evidence
