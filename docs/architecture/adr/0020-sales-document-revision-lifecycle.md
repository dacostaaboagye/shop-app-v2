# ADR 0020: Sales Document Revision Lifecycle

## Status

Accepted.

## Context

The current sales implementation supports:

- original sale invoice creation
- partial or full return through credit-note issuance
- immutable issued-document snapshots for invoice and credit-note output

This is implemented today through the `invoices` table, credit-note
`parentInvoiceId`, and the POS return flow in the `sales` module.

That model is not sufficient for the post-UAT business requirement:

- a customer buys multiple items
- part of the sale is returned
- the system must retain the original invoice
- the system must issue a credit note for the returned portion
- the system must automatically produce a final adjusted invoice that becomes
  the current payable truth

The current system stops at the credit note. Users must infer the final state
manually, which weakens auditability, customer-service clarity, and reporting.

The system also needs to support:

- repeated return or revision cycles
- document-chain visibility from any document entry point
- immutable issued documents even when a later revision changes the financial
  truth

## Decision

Sales document revisions will be modeled as immutable documents connected by an
explicit revision chain.

- The original invoice remains immutable after issuance.
- A return creates a credit note that references the document it revises.
- A partial return also creates an adjusted replacement invoice representing the
  remaining valid sale.
- The adjusted invoice becomes the current payable sales document for that
  revision state.
- The superseded invoice remains visible for audit and traceability but is no
  longer treated as the final operational truth.
- Subsequent returns or corrections continue the chain rather than mutating any
  existing document.

The required lifecycle is:

`Original invoice -> Credit note -> Adjusted invoice`

For repeated revisions, the chain continues from the current payable invoice.

## Document Model

The platform will distinguish between:

- document identity
- document revision relationship
- current payable state

Required model properties:

- every financial document keeps its own immutable issued snapshot
- every financial document knows whether it is:
  - original
  - credit note
  - adjusted replacement invoice
- every revised or superseded invoice can point to the document that replaced
  it
- every adjusted invoice can point back to the credit note and prior invoice
  that produced it
- the system can resolve the latest valid payable document in a chain without
  frontend inference

The persistence design may use status fields, explicit link columns, or a
dedicated revision-link table, but it must preserve append-only accountability
for the document chain.

## Status Semantics

Invoice lifecycle semantics must expand beyond `confirmed` and `voided`.

Required operational states:

- `confirmed`: issued and currently valid
- `superseded`: historically valid but replaced by a later adjusted invoice
- `voided`: cancelled or invalidated outside the revision flow

Credit notes remain issued documents in their own right and should not be used
as a proxy for the final payable state.

## Return Processing Rules

When a return is processed:

- full validation still happens against the currently payable invoice lines
- a credit note is issued for the returned quantities
- the source invoice is marked superseded when the return is partial
- a new adjusted invoice is issued automatically for the remaining quantities
- if the return removes all remaining quantities, the chain ends with the credit
  note and no adjusted invoice is created

Repeated returns must validate against the latest adjusted invoice, not the
original invoice once that original has been superseded.

## API And UI Contract Rules

Public responses must expose revision-chain metadata using approved public
references, not raw internal IDs.

Invoice detail responses should expose enough information to render:

- source document
- linked credit notes
- replacement adjusted invoice
- whether the current document is the latest payable truth

List and reporting endpoints should be able to:

- include or exclude superseded invoices deliberately
- resolve the latest payable document without client-side reconciliation
- preserve document-type and chain visibility under permission scope

## Reporting Rules

Operational reporting and dashboards must not infer financial truth from raw
document totals alone once revisions exist.

The backend must provide a consistent rule for:

- gross original sales
- credited value
- current payable sales
- return rate and revision counts

This avoids dashboards or exports double-counting original and adjusted
documents together.

## Consequences

Benefits:

- partial returns become auditable end-to-end
- users can navigate the document lifecycle directly
- reporting can distinguish original sales from current payable truth
- immutable issued-document snapshots remain valid evidence

Tradeoffs:

- sales schema and contracts must expand
- existing invoice queries and list screens must learn superseded and adjusted
  semantics
- reporting must explicitly choose between original, credited, and adjusted
  measures
- official-document generation must label revised and adjusted relationships

## Public DTO Decision

Workforce-facing invoice contracts may continue to expose the UUID fields that
already existed before this ADR was accepted while E-09 hardens the current POS
surface. Those UUIDs are treated as accepted public UUIDs for the workforce API
only.

Customer-facing invoice contracts must not reuse the workforce DTO as-is. The
customer portal and ecommerce slices must introduce customer-safe responses that
use invoice references, order references, location display names, SKU strings,
and document-chain references instead of worker ids, location ids, sku ids, or
stock movement ids.

This keeps existing POS/admin/manager/worker behavior stable while preventing
future customer surfaces from inheriting internal operational identifiers.

## Initial Implementation Direction

Implementation should proceed in this order:

1. extend schema to represent superseded and replacement relationships
2. extend sales contracts and invoice detail DTOs with chain metadata
3. update return processing to validate against the latest payable invoice and
   create adjusted invoices where required
4. update invoice detail and related-document UI surfaces
5. update reporting and dashboard queries to use backend-defined truth rules

## Acceptance Direction

The first implementation slices should prove:

- partial return creates credit note plus adjusted invoice
- full return creates credit note without a replacement invoice
- repeated partial returns continue from the latest adjusted invoice
- superseded invoices remain downloadable and visible but are labeled
  appropriately
- API responses expose document-chain references without leaking raw IDs
