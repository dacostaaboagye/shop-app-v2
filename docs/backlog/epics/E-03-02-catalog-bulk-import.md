---
id: E-03-02
title: Import products and variants in bulk via file upload
status: shipped
priority: P1
domain: full-stack
owner: codex
parents: [E-03-01]
acceptance:
  - A manager can download a template file showing required and optional columns with example data.
  - A manager can upload a completed file and receive confirmation that it has been received.
  - Valid rows in the file are imported; rows with errors are skipped and reported with row-level reasons.
  - After processing, the manager can see imported and failed counts and download a failed-row report.
  - Duplicate SKUs within the same file are detected and reported, not only duplicates against the existing catalogue.
  - A manager can bulk import categories and brands before importing products that reference them.
  - Large files are processed without blocking the page.
size: large
---

## Why

Managers need to populate hundreds of products and sellable variants before go-live. Manual entry through product forms is too slow and error-prone for initial setup. Bulk import lets the business load catalogue data quickly while preserving SKU uniqueness, validation, and auditability.

## Scope

- CSV import for one row per variant; repeated product fields group variants under the same product name.
- Template download with required and optional columns plus example rows.
- Upload/start endpoint that stores an import job and returns a public job reference.
- Server-side parser and validation with row-level errors.
- Import execution that skips invalid rows, imports valid rows, and produces summary counts.
- Job status and failed-row report endpoints for the manager UI.
- Admin products page entry point with upload, status, summary, and failed-report download.
- Dedicated CSV template and upload flows for bulk brands.
- Dedicated CSV template and upload flows for bulk categories, including parent category references by slug.

## Columns

Required:

- `productName`
- `variantName`
- `sku`
- `unitOfMeasure`
- `costPrice`
- `sellingPrice`

Optional:

- `categorySlug`
- `brandSlug`
- `barcode`
- `status`
- `description`
- `countryOfOrigin`
- `isTaxable`
- `priceIncludesTax`
- `taxCategory`
- `attributesJson`
- `weightGrams`
- `packagingType`
- `manufacturerPartNumber`
- `customsCode`

## Out of scope

- General media upload UX or R2 hardening.
- Invoice PDF or stock-transfer document rendering.
- Initial stock counts, stock transfers, supplier linkage, or opening balances.
- Auto-creating categories, brands, suppliers, or locations during product import. Categories and brands are imported through their dedicated bulk import flows first.
- XLSX parsing in the first PR unless a lightweight dependency can be added safely without delaying CSV value.

## Design decisions

- Use public job references such as `CIMP-00001`; never expose internal job IDs.
- Use `catalog.products.manage` for the first implementation unless a separate `catalog.import.manage` permission is introduced deliberately.
- Store import jobs in the database so uploads and results are auditable and recoverable across requests.
- Keep the import file payload in the job record for the first implementation with conservative size and row limits. R2-backed import file storage can be introduced later if file sizes exceed the limits.
- Return a queued job reference immediately and process through an in-process scheduler behind a job abstraction. A durable queue/worker can replace the executor later without changing the public contract.
- Validate by row, skip failed rows, and continue processing valid rows.
- Reject duplicate SKUs within the same file. Existing SKU conflicts are row-level failures.
- Category and brand references must already exist when supplied.
- Brand and category bulk imports use existing catalog write services so permissions, slugs, change logs, and platform events remain consistent with manual creation.
- Brand and category imports are bounded synchronous setup helpers for catalogue taxonomy. The durable queued job/status/report workflow applies to product/variant imports, where file size and processing time are materially higher.

## UAT scenarios

1. Clean file: manager downloads template, fills three products and five variants, uploads, job completes, and products/variants appear in catalog search.
2. Mixed file: missing SKU, invalid money, unknown category, duplicate existing SKU, and malformed attributes appear in the failed-row report while valid rows import.
3. Intra-file duplicate: two rows share the same SKU and the report explains the duplicate.
4. Large file: upload returns a job reference quickly and the UI remains usable while status is shown.
5. Permission: users without catalog product management permission cannot start imports, view job results, or download reports.
6. Retry correction: manager fixes failed rows from the report and re-uploads them without duplicating previously imported SKUs.
7. Brand setup: manager downloads the brand template, imports active and archived brands, and receives row-level failures for duplicate or existing names.
8. Category setup: manager downloads the category template, imports parent and child categories by slug, and receives row-level failures for missing names, invalid statuses, duplicates, or invalid parent references.

## Definition of Done

- Contracts cover template, import start, job status, and failed-report response shapes.
- Parser tests cover clean, mixed, duplicate, malformed, and limit cases.
- API tests cover permission, validation, job creation, processing summary, and report download.
- Frontend covers loading, empty, error, pending, completed, and failed-row states.
- Brand and category imports have contract, parser, service, API, and frontend coverage for success and row-level failure paths.
- Product/variant imports provide durable job status and failed-row report recovery; brand/category imports return immediate row-level results and a downloadable failed-row CSV from the dialog result.
- `pnpm guard` passes; `pnpm verify` runs when practical.

## Related PRs

- Product/variant bulk import workflow: https://github.com/dacostaaboagye/shop-app-v2/pull/110
- Bulk category and brand imports: https://github.com/dacostaaboagye/shop-app-v2/pull/111

## Shipped Evidence

- Shipped to `dev` on 2026-05-03.
- PR #110 delivered product/variant CSV import templates, queued upload jobs, parser validation, row-level failures, job status, failed-row reports, and admin UI.
- PR #111 delivered dedicated brand/category CSV imports with templates, row-level validation, permissioned API routes, admin UI entry points, and failed-row CSV export.
- Local verification before PR #111: `pnpm guard`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed. Build emitted a non-fatal local disk-space warning after successful tasks.
