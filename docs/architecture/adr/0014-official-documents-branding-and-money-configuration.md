# ADR 0014: Official Documents, Brand Governance, And Money Configuration

## Status

Accepted for phased implementation.

## Context

The current sales document experience was built around printable receipt markup
and text sharing. That is not sufficient for production operations because
official business documents must preserve brand identity, legal details,
currency, numbering, and issued content. Users also need to download and share
documents as files, not copied text.

The platform also has no first-class currency configuration yet. Sales totals,
future ecommerce prices, refunds, invoices, exchange rates, stock valuation, and
reports need a shared money model instead of isolated display strings.

## Decision

The platform will use a shared official document architecture.

- Official documents are rendered from document DTOs plus a resolved document
  profile.
- The document profile is resolved from global admin configuration and optional
  location-level overrides.
- Brand identity is globally controlled by administrators.
- Location managers may override operational location details for assigned
  locations, but not the core brand identity.
- Share actions must share a document file where the browser supports file
  sharing.
- Download actions must produce a complete standalone document file.
- Browser print remains available for paper output and user-driven PDF printing.
- Server-generated PDFs will be added after document snapshots are persisted.

## Document Types

The system should support these official documents.

- Sales receipt
- Tax invoice
- Credit note
- Refund receipt
- Payment receipt
- Quotation
- Customer statement
- Goods Transfer Note
- Dispatch note
- Delivery note
- Goods received note
- Picking list
- Stock transfer request
- Stock adjustment note
- Stock count sheet
- Stock variance report
- Damaged or lost stock report
- Purchase order
- Supplier goods received note
- Supplier return note
- Shift closing report
- Cash drawer report
- Daily sales summary
- User access change report
- Audit export

## Configuration Ownership

Global admin configuration owns:

- Brand name
- Brand logo
- Brand colors
- Legal business name
- Company registration number
- Tax registration number
- Main address
- Main contact details
- Default document footer
- Default paper sizes
- Default currency
- Default locale
- Default timezone
- Default tax mode
- Document numbering rules
- Fields that location managers may override

Location-level configuration may override:

- Branch display name
- Branch address
- Branch contact details
- Branch tax or fiscal identifier when legally required
- Receipt footer
- Local paper size
- Local timezone
- Location-specific payment instructions
- Location-specific numbering prefix if admin allows it

Location-level configuration may not override:

- Brand logo
- Brand colors
- Core brand name
- Legal company identity
- Global currency policy
- System tax rules unless admin explicitly enables a separate legal entity mode

## Money And Currency Model

Money must become currency-aware before ecommerce pricing is implemented.

- Store currency as ISO 4217 codes such as `GHS`, `USD`, or `EUR`.
- Store monetary amounts as minor units or fixed-scale decimals, never floating
  point calculations.
- Persist the currency code with every official monetary amount.
- Keep currency scale and rounding policy in configuration.
- Backend services own calculations for totals, tax, discounts, refunds, and
  reporting.
- Frontend helpers format already-calculated monetary values.
- Issued documents snapshot monetary values exactly as issued.

Future ecommerce requirements:

- Base currency for accounting.
- Enabled display currencies.
- Currency-specific price lists.
- Optional exchange rates.
- Currency-specific rounding.
- Historical exchange-rate snapshots.
- Reporting normalized to base currency.

## Implementation Phases

Phase 1 introduces frontend document-safe actions.

- Replace text sharing with document file sharing.
- Add standalone HTML document download.
- Standardize printable receipt branding.
- Add shared frontend document helpers.

Phase 2 introduces configuration persistence.

- Add global business profile, brand settings, currency settings, and document
  settings tables.
- Add admin APIs and screens.
- Add validation for logo, brand colors, currency, locale, timezone, and
  numbering rules.

Phase 3 introduces location overrides.

- Add location document settings.
- Add manager-scoped APIs for assigned locations.
- Add a resolver that combines global config with location overrides.
- Emit audit/platform events for every setting change.

Phase 4 introduces issued document snapshots.

- Store immutable document snapshots for receipts, invoices, GTNs, dispatch
  notes, credit notes, and refunds.
- Render print, download, and share from snapshots.
- Add document statuses: `draft`, `issued`, `voided`, `corrected`.

Phase 5 introduces server-generated PDFs.

- Generate PDFs from document snapshots on the backend.
- Store document files or signed download URLs.
- Add access-controlled document download endpoints.
- Preserve the same document rendering contract across print, HTML, and PDF.

## Consequences

Benefits:

- Documents become official operational records instead of ad hoc UI exports.
- Brand and legal details are consistent across the platform.
- Location managers get useful local control without weakening brand governance.
- Ecommerce can reuse the same money and document foundation.
- Historical issued documents remain reproducible.

Tradeoffs:

- The system needs additional configuration tables and admin UX.
- Existing sales, stock transfer, procurement, and reporting flows must migrate
  to document DTOs over time.
- Server-side PDFs require an additional rendering pipeline.
- Money migration must be planned carefully to avoid rounding regressions.

## Current Implementation Notes

Sales receipts, sales invoices, and credit notes now read from immutable issued
document snapshots before printing, downloading, or sharing. Downloads and
native file shares use an access-controlled server-rendered PDF generated from
the stored snapshot, with content-hash evidence embedded in the document. The
invoice detail UI also renders the same issued PDF inline so users preview the
official document before download or share.
