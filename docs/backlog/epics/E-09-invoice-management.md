---
id: E-09
title: Invoice management and financial document lifecycle
status: designed
priority: P1
domain: full-stack
owner: codex
parents: [E-00D]
acceptance:
  - Every confirmed sale issues an immutable invoice or receipt using the correct channel sequence: `INV-POS`, `INV-CPO`, `INV-WEB`, or `INV-MAN`.
  - Invoice line items preserve the sold SKU, product/variant names, quantity, unit price, tax values, and totals exactly as issued, independent of later catalog edits.
  - Returns issue linked `CRN-` credit notes without mutating or deleting the original invoice.
  - Partial returns create an adjusted replacement invoice and expose the document chain so users can identify the latest payable document without client-side inference.
  - Admins can search, filter, inspect, export, print, download, share, and email invoices across visible channels and locations.
  - Managers can search, filter, inspect, print, download, share, and email invoices for locations where they hold sales authority.
  - Workers can view, print, download, share, and return sales documents they created or are accountable for.
  - Customer-facing channels can expose customer invoices without leaking workforce-only IDs or location-internal data.
  - Public sales document responses use approved public references, slugs, or explicitly approved UUIDs; raw internal surrogate IDs stay server-side.
  - Reporting rules distinguish gross original sales, credited value, adjusted payable value, and voided/superseded documents.
size: large
---

## Why

E-09 is the document and financial-truth layer that downstream sales channels depend on. E-07 POS, E-12 customer portal orders, E-14 ecommerce fulfilment, and E-16 buyer payments all need the same invoice rules before they can be considered financially safe.

The product cannot treat invoices as simple sale rows. Invoices are customer-facing evidence, audit artifacts, tax/compliance documents, and the source for revenue reporting. Once returns, refunds, manual corrections, and multiple sales channels exist, the platform needs one lifecycle for original invoices, credit notes, adjusted replacement invoices, issued document snapshots, and reporting truth.

## Workbook Source

The workbook `EPIC9` sheet defines E-09 as:

- auto-generate invoices on every confirmed sale using channel-specific sequences from E-00D
- generate `CRN-` credit notes linked to parent invoices for returns or refunds
- never delete or modify original invoices
- let shop workers view, print, or share invoices for sales they processed
- let customers view and download invoices in their portal
- let admins search, filter, and export invoices across channels
- let managers manually raise exceptional invoices with mandatory approval and reason

Workbook edge cases:

- invoices generated during handover must reference the active responsible worker and handover context
- partial returns must clearly show original invoice, credit note, remaining balance, and adjusted document
- invoice numbering gaps are acceptable and logged; invoices are never renumbered

## Current System Read

E-09 is partially implemented ahead of formal ticketing.

Implemented foundations:

- `reference-number.service.ts` supports `invoice-pos`, `invoice-portal`, `invoice-web`, and `invoice-manual`.
- `packages/database/src/schema/sales.ts` stores invoices, line snapshots, document type, status, parent invoice, replacement invoice, revision root, and revision credit note links.
- `packages/contracts/src/sales.ts` exposes invoice role, status, type, line snapshots, document filters, and revision-chain metadata.
- `PosSaleService` creates POS invoices with `INV-POS` references.
- POS returns create `CRN-` credit notes.
- Partial returns create adjusted replacement invoices and mark the prior payable invoice as `superseded`.
- `PostgresInvoiceQueryRepository` resolves the current payable document in a chain.
- `SalesIssuedDocumentSnapshotService` issues immutable official document snapshots for sales receipts, invoices, and credit notes.
- Server-generated PDFs, download, share, print, and email flows exist for sales documents.
- Admin, manager, and worker sales ledger/detail surfaces exist in the web app.
- ADR 0020 documents the sales document revision lifecycle.
- ADR 0014 documents official document snapshots, PDFs, branding, and money configuration.

Important gaps:

- Admin sales currently aggregates manager/location-scoped calls in the frontend instead of using a dedicated admin invoice API.
- Portal, ecommerce, and manual invoice issuance are not implemented.
- Customer invoice access is not implemented.
- Export is not implemented.
- Manual exceptional invoices and approval workflow are not implemented.
- Handover context is not surfaced on invoice documents yet.
- Numbering gaps are technically possible and acceptable. E-09-01 adds operator-visible logging whenever sales invoice references are reserved so gaps can be reconciled without renumbering.

## Out of Scope

- Payment gateway capture, refund settlement, and reconciliation. E-16 owns payment provider integration.
- Customer portal order approval and fulfilment workflow. E-12 owns customer ordering.
- Ecommerce storefront and checkout. E-13 and E-16 own buyer acquisition and payment.
- Delivery lifecycle. E-00C/E-14/E-15 own delivery creation, assignment, and agent execution.
- Supplier invoices and purchase orders except where official document patterns are reused.
- Offline POS.
- Fiscal-printer or government e-invoicing integration.
- Full accounting ledger or double-entry bookkeeping.

## Design Direction

E-09 should formalize invoice management as a shared document lifecycle, not a POS-only feature.

Core decisions:

- Keep invoices immutable after issuance.
- Model revisions through linked documents, never by editing the original invoice totals.
- Treat credit notes as their own issued documents, not as hidden adjustments.
- Treat adjusted replacement invoices as the current payable truth after partial returns.
- Keep issued document snapshots immutable and render print, download, share, email, and PDF from the snapshot.
- Keep channel-specific reference sequences stable:
  - POS: `INV-POS`
  - customer portal: `INV-CPO`
  - ecommerce web: `INV-WEB`
  - manual exceptional invoice: `INV-MAN`
  - credit note: `CRN-{parentReference}`
- Let numbering gaps stand. The system must log or report them; it must never renumber.
- Backend services own financial calculations and reporting truth. Frontend screens render already-calculated totals.
- Public APIs expose document references and chain metadata. Customer-facing APIs must not expose staff-only identifiers.

## User Journeys

### Worker Issues POS Invoice

1. Worker opens POS and completes a sale.
2. Backend validates stock, attribution, price snapshot, and location permission.
3. Backend reserves the next `INV-POS` number and inserts the invoice, line items, stock movements, and issued document snapshot.
4. Worker sees the sale success panel with the invoice reference.
5. Worker can print, download, share, email, or later open the invoice from sales history.

### Worker Processes Return

1. Worker opens an invoice they are allowed to return.
2. Worker selects returned lines and enters a reason.
3. Backend validates against the current payable invoice, not a superseded original.
4. Backend issues a `CRN-` credit note.
5. If the return is partial, backend also issues an adjusted replacement invoice and marks the prior payable invoice as `superseded`.
6. UI shows the document chain and highlights the latest payable document.

### Manager Reviews Location Sales

1. Manager opens `/manager/sales`.
2. Manager selects one managed location.
3. Manager filters by date, classification, document type, search text, and worker where available.
4. Manager opens a document detail and can print, download, share, or email it.
5. Manager can follow linked credit notes and adjusted invoices without manually reconciling references.

### Admin Reviews Network Invoices

1. Admin opens `/admin/sales`.
2. Admin can review all visible locations or filter to one location.
3. Admin can search/filter/export invoices across channel, document type, status, location, customer, worker, and date.
4. Admin can open any invoice chain and download the official issued PDF.
5. Admin export preserves reporting semantics for gross sales, credits, adjusted payable value, and voided/superseded documents.

### Customer Downloads Invoice

1. Customer opens their portal order or invoice list.
2. Customer sees invoices tied to their account or verified email.
3. Customer can download an issued PDF.
4. Customer can see credit notes and adjusted invoices that affect their payable balance.
5. Customer never sees internal worker ids, location ids, stock movement ids, or permission context.

### Manager Raises Manual Exceptional Invoice

1. Manager starts a manual invoice request for a managed location.
2. Manager enters customer, line, price, tax, reason, and supporting note.
3. Backend records the request as pending approval; no official invoice number is issued yet unless the approval design chooses draft numbering.
4. Approver reviews the request, approves or rejects with reason.
5. On approval, backend issues `INV-MAN`, snapshots the document, and records audit evidence.

## Proposed Slices

### E-09-01 Invoice Lifecycle Hardening - shipped

Goal: make the current POS invoice and return lifecycle production-grade before additional channels depend on it.

Scope:

- Accept or revise ADR 0020.
- Add focused lifecycle tests for original invoice -> credit note -> adjusted invoice, full return, repeated partial return, and superseded validation.
- Verify immutable issued snapshots are created from the document state at issue time and do not drift after later revisions.
- Add an explicit backend helper for "latest payable invoice" so reports, details, and future channels do not duplicate chain traversal.
- Add sequence-gap logging or an operator-visible sequence reservation event when an invoice number is reserved but the transaction does not issue a document.
- Document the DTO decision from ADR 0020: existing workforce invoice UUID fields remain accepted for workforce APIs; future customer invoice DTOs must be reference/slug based and must not reuse the workforce DTO as-is.

Shipped in [PR #194](https://github.com/dacostaaboagye/shop-app-v2/pull/194).

Evidence:

- Accepted ADR 0020 and documented the workforce/customer invoice DTO boundary.
- Extracted shared invoice lifecycle helpers for current payable invoice/reference resolution.
- Added regression tests for latest payable resolution, credit-note chain resolution, cycle protection, full return without adjusted invoice, repeated partial returns, immutable issued snapshots, and reference reservation metadata.
- Added non-blocking sales invoice reference reservation logging for sequence-gap reconciliation.
- Verified with focused E-09 API tests, full API test suite, `pnpm verify`, and GitHub CI `validate`.

### E-09-02 Admin Invoice API And Export

Goal: give finance/admin users a real cross-location invoice management surface instead of frontend aggregation over manager endpoints.

Scope:

- Add `GET /api/admin/invoices`.
- Add `GET /api/admin/invoices/:reference`.
- Add export endpoint for CSV first; PDF report can follow if needed.
- Filters: channel/type, status, classification, location, customer, worker, date range, document reference, current-payable only.
- Response includes reporting totals calculated by backend rules.
- Admin UI uses the admin endpoints and supports loading, empty, error, pagination, and export states.

### E-09-03 Channel Invoice Issuance Port

Goal: make POS, customer portal, ecommerce, and manual invoices use one issuance service.

Scope:

- Extract a channel-neutral invoice issuance service from POS-only code.
- Inputs include channel, source reference, location, customer snapshot, line snapshots, attribution, payment/settlement context, and idempotency key.
- Generate the correct reference sequence by channel.
- Preserve stock/payment side effects in caller-owned transactions where needed.
- Add contracts for portal/ecommerce/manual invoice creation outputs without exposing internal ids.

### E-09-04 Customer Invoice Access

Goal: allow customer-facing portals to expose invoices safely.

Scope:

- Add customer-scoped invoice list/detail/download endpoints.
- Authorize by authenticated customer account and order/customer relationship, not by possession of a reference alone.
- Strip workforce-only fields.
- Show original, credit note, adjusted invoice, and current payable state.
- Add customer portal invoice list/detail UI when the customer portal shell exists.

### E-09-05 Manual Exceptional Invoice With Approval

Goal: support controlled manager-raised invoices without weakening financial governance.

Scope:

- Add manual invoice request table or workflow state.
- Manager can create a pending request for their managed location.
- Approver with finance/admin permission approves or rejects.
- Approved request issues `INV-MAN` and immutable snapshot.
- Rejected request remains visible with reason.
- Every state transition is append-only/audited.

## Permissions

Existing permissions should be reused where they match current sales authority:

- Worker POS creation: `pos.sales.process`, location scoped.
- Worker own sales visibility: authenticated actor plus server-side ownership/created-by check and `pos.sales.view` where applicable.
- Manager sales management: `pos.sales.manage`, location scoped.
- Admin invoice management: use an admin/global sales or reporting permission if already seeded; otherwise introduce the narrowest permission in the implementation slice, not in this design doc.
- Customer invoice access: customer auth boundary plus customer/order relationship. Do not reuse workforce permissions.
- Manual exceptional approval: separate approval permission is recommended; do not make all managers approvers by default.

Frontend visibility remains convenience only. API route metadata plus service-level data checks are the access-control boundary.

## Reporting Rules

E-09 must define backend-owned reporting semantics:

- Gross original sales: original confirmed invoices/receipts before credits.
- Credited value: issued credit-note totals.
- Current payable sales: latest confirmed payable invoice in each chain.
- Superseded value: historical documents retained for audit but excluded from current payable totals.
- Voided value: excluded from payable totals but visible in audit/export.
- Return rate: credited value divided by eligible gross sales for the selected scope and period.
- Revision count: number of credit notes and adjusted invoices linked to a chain.

Exports and dashboards must choose one of these measures explicitly. They must not sum every invoice-like row blindly.

## Edge Cases

- Partial return: original remains immutable, credit note is issued, adjusted invoice becomes latest payable.
- Full return: credit note is issued, prior payable invoice becomes superseded, no adjusted invoice is created.
- Repeated return: validation starts from the latest payable adjusted invoice.
- Return attempted against a superseded invoice: backend redirects/returns a clear validation error pointing to the latest payable reference.
- Invoice generated during handover: invoice records responsible worker and handover context where available.
- Catalog item renamed, repriced, archived, or deleted after sale: invoice line snapshot remains unchanged.
- Number reserved but transaction fails: gap is logged; no renumbering.
- Email send fails after snapshot exists: document remains issued; UI can retry send.
- PDF generation fails: snapshot remains source of truth; user sees retryable document error.
- Customer email missing: email action is hidden or returns a safe validation error.
- Cross-location manager access: manager cannot list, export, download, or email invoices outside their location scope.
- Customer guesses invoice reference: customer endpoint rejects unless relationship is proven.

## Security And Data Integrity

- Invoice references are public, but reference possession is not authorization.
- Customer-facing responses must not expose `locationId`, `workerId`, `skuId`, `stockMovementId`, internal source keys, or permission state unless the UUID has been explicitly approved as public for that contract.
- Issued snapshots are immutable evidence. Corrections use credit notes, adjusted invoices, voids, or explicit compensating documents.
- Manual invoices need approval and reason because they can create revenue evidence without a normal sale source.
- Export endpoints must be permission scoped and rate limited because they can expose financial and customer data at scale.
- Email actions must rate-limit and avoid leaking whether a customer email exists outside the actor's scope.
- Logs must avoid full customer email addresses at info level; use request id, actor slug, document reference, and masked/hash values where needed.

## Test Plan

- Contract tests cover document roles, statuses, type filters, revision-chain metadata, and customer-safe DTOs.
- Service tests cover POS original invoice creation with immutable line snapshots.
- Return tests cover full return, partial return, repeated partial return, and superseded invoice rejection.
- Repository tests cover latest-payable resolution and cycle protection.
- Route tests cover worker own access, manager location scope, admin global scope, customer relationship scope, and forbidden reference guessing.
- Export tests verify totals for gross, credited, adjusted payable, superseded, and voided documents.
- Official document tests verify snapshot immutability, PDF rendering, download headers, email behavior, and retryable failures.
- UI helper tests cover filters, empty/error/loading states, chain labels, current-payable highlighting, and export actions.
- Playwright checks admin, manager, worker, and customer invoice journeys at desktop and mobile widths once each UI slice lands.

## UAT Scenarios

1. Worker completes a POS sale, prints the receipt, downloads the PDF, and later opens the same immutable invoice from sales history.
2. Worker processes a partial return and confirms the detail page shows original invoice, credit note, adjusted invoice, and latest payable marker.
3. Worker attempts a second return from the original superseded invoice and is directed to the latest payable document.
4. Manager reviews one location's invoices, filters to credit notes, opens a document, and emails it to a customer with an email on file.
5. Admin exports all invoices for a date range and verifies gross, credited, and current payable totals do not double-count adjusted documents.
6. Customer downloads an invoice and credit note from their portal without seeing staff or stock-internal identifiers.
7. Manager submits a manual exceptional invoice request and an approver approves it, producing an `INV-MAN` document with audit evidence.

## ADR Impact

No new ADR is required before implementation. E-09 implements ADR 0020 and ADR 0014.

E-09-01 accepts ADR 0020 and adds the public DTO decision that separates existing workforce invoice DTOs from future customer-safe invoice DTOs.

## Open Questions

- Should manual invoice requests reserve a visible draft reference before approval, or should `INV-MAN` only be reserved at approval time?
- Which existing permission should own admin invoice export, or should E-09 introduce `invoices.export`?
- Are existing UUID fields in sales contracts approved public UUIDs, or should E-09 add slug/reference alternatives before customer portal work?
- Should credit-note references remain `CRN-{parentReference}` for every revision, or should high-volume repeated returns use an additional sequence suffix?
- Should customer invoice access be keyed by customer account only, verified email only, or both?

## Dependencies

- E-00D public identifiers and route authorization are shipped.
- ADR 0014 official documents and money configuration are partially implemented.
- ADR 0020 sales revision lifecycle is accepted.
- E-07, E-12, E-14, and E-16 should consume the E-09 issuance and document-chain model rather than inventing channel-specific invoice behavior.

## Related Files

- `docs/architecture/adr/0014-official-documents-branding-and-money-configuration.md`
- `docs/architecture/adr/0020-sales-document-revision-lifecycle.md`
- `packages/contracts/src/sales.ts`
- `packages/database/src/schema/sales.ts`
- `packages/database/src/schema/official-documents.ts`
- `apps/api/src/modules/sales/`
- `apps/api/src/modules/official-documents/`
- `apps/web/src/components/sales/`
