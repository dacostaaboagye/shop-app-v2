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
- Sales receipts, sales invoices, and credit notes now issue/read immutable
  document snapshots through `/api/documents/sales/:reference/snapshot`.
- Sales document snapshot access is enforced server-side: managers/admins need
  `pos.sales.manage` at the sale location, while workers need `pos.sales.view`
  and must be the attributed/creating worker.
- Existing POS sale read/process/return routes now also enforce location scope
  and ownership at the API boundary, so the live invoice detail endpoint cannot
  leak another worker's sales before snapshot authorization runs.
- Worker and manager invoice detail pages now print, download, and share from
  the issued snapshot instead of live document settings. If the snapshot cannot
  be loaded or parsed safely, official document actions are disabled with a
  recoverable error state.
- Access-controlled server download endpoint added for issued sales documents:
  `/api/documents/sales/:reference/download` returns an official PDF rendered
  from the immutable snapshot and includes snapshot hash evidence.
- Worker and manager invoice detail pages render the issued PDF inline so users
  view the same official document that will be downloaded or shared.
- Worker and manager sales detail pages now share a document-workspace layout:
  official document status/actions/evidence, sale summary, line items, and PDF
  preview are grouped into a two-column workspace on larger screens and collapse
  cleanly on smaller screens.
- Sales PDF layout was redesigned with a branded page shell, structured metadata
  panel, tighter line-item table, adjacent totals, and non-overlapping document
  evidence/footer.
- Frontend download/share actions now fetch the server-issued PDF. Native share
  receives the same PDF file; unsupported share falls back to downloading it.
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
  assignment, notification, stock-transfer, and worker POS screen files. The
  manager/worker supply request page violations and backend POS sales route
  violation have been removed. Route access, public ID, and frontend style
  guards pass.

## Important Limitation

The current implemented production format for issued sales documents is a
server-generated PDF from immutable snapshots. Browser receipt printing remains
available for local paper output, but official download/share uses PDF.

## Next Production Items

1. Extend immutable issued document snapshots to refunds, GTNs, dispatch notes,
   stock adjustments, stock counts, procurement documents, and reports.
2. Extend server PDF rendering and preview to GTNs, dispatch notes, stock
   adjustments, stock counts, procurement documents, and reports.
3. Add durable generated-file storage or cache invalidation policy if PDF
   generation becomes expensive at scale.
4. Migrate stock transfer, procurement, and reporting documents onto the
   same document DTO and rendering contract.
