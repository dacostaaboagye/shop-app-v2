# Official Documents Workstream Status

## Current Slice

Ticket context: `E-02-01J`

This slice replaces text-only invoice sharing with document-first actions for
sales documents.

Implemented:

- Shared frontend official document profile.
- Shared sales document HTML builder.
- Safe standalone HTML document download.
- Native file sharing for browsers that support `navigator.share` with files.
- Download fallback when native file sharing is unavailable.
- Branded printable invoice/receipt output with logo mark, legal profile,
  currency code, tax identifier, footer, and official document status.
- ADR for the production architecture covering brand governance, location
  overrides, document snapshots, currency configuration, and future PDFs.
- Database-backed global official document settings schema.
- Database-backed location document override schema.
- Admin and manager-scoped API routes for document settings.
- Permission catalogue entries for global settings and location overrides.
- Admin settings screen for brand, legal identity, currency, paper size,
  timezone, and official footer defaults.
- Resolved document profile endpoint used by printable and shareable sales
  documents.
- Worker and manager invoice detail pages now fetch effective document
  profiles by location before printing, downloading, or sharing.
- Manager location document settings screen for scoped branch overrides, with
  inherited-field behavior and effective print profile preview.
- Admin and manager document settings are grouped into tabs so future settings
  categories can be added without turning the page into one long form.
- Currency and timezone inputs are controlled selects backed by shared supported
  value lists.
- Official document contracts now reject unsupported currency codes and IANA
  time zone values at the API boundary.
- Default official document footer is prefilled with production-ready wording
  covering document validity, retention, returns/exchanges/warranty support, and
  enquiry references. A data migration upgrades only records still using the
  original stock footer, preserving customized footers.
- Issued document snapshot foundation added: generic `issued_documents` table,
  document type enum, profile/payload JSON snapshots, content hash,
  schema version, resource uniqueness, and immutable/idempotent snapshot service.
- Manager and worker supply request pages split into smaller files so future
  stock-transfer UX work does not build on 700+ line client components.

Validation:

- `pnpm --filter @shop/web test`
- `pnpm --filter @shop/web exec tsc -p tsconfig.json --noEmit`
- `pnpm guard:frontend`
- `pnpm --filter @shop/contracts test`
- `pnpm --filter @shop/database test`
- `pnpm --filter @shop/api test`
- `pnpm --filter @shop/api exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @shop/database db:migrate`
- `pnpm guard:routes`
- `pnpm guard:public-ids`
- `pnpm guard`

Known repo blocker:

- `pnpm guard` still fails on existing file-length violations across stock,
  assignment, notification, and POS files. The manager and worker supply request
  page violations have been removed. Route access, public ID, and frontend style
  guards pass.

## Important Limitation

The current download/share format is a standalone official HTML document.
This is intentional for this frontend slice because the repo does not currently
include a PDF rendering pipeline. Server-generated PDFs should be added after
immutable document snapshots are persisted.

## Next Production Items

1. Store immutable issued document snapshots for sales receipts, invoices,
   credit notes, refunds, GTNs, dispatch notes, and stock documents.
2. Add access-controlled document download endpoints.
3. Add backend PDF generation from stored snapshots.
4. Migrate sales, stock transfer, procurement, and reporting documents onto the
   same document DTO and rendering contract.
