# Catalog Change Log

Append-only ledger of every catalog mutation. Per ADR 0003, lifecycle
history of products, variants, brands, categories, options, and
option-values lives here — separate from the entity tables themselves.

## What ships in PR 1 (this module)

- `catalog_change_log` table (`packages/database/src/schema/catalog-change-log.ts`).
- `CatalogChangeLogWriter` interface and `PostgresCatalogChangeLogWriter` impl.
- `diffSnapshot` helper for computing before/after deltas scoped to an
  explicit tracked-fields allowlist.
- Runtime factory: `createCatalogChangeLogRuntime()`.

The writer is consumed by catalog write commands, **wired in PR 2**
(see epic `E-03-07`). Without that wire-up, no production code calls
`writer.record()` yet.

## Design notes

- **One row per write operation.** `changedFields[]` carries the field
  names that actually changed; `before` and `after` carry subset
  snapshots of just those fields. No whole-row snapshots, no per-field
  fan-out.
- **No-op short-circuit.** Callers compute `diffSnapshot()` first; if
  `changedFields.length === 0`, do not call `writer.record()`. The
  writer itself does not check — that's the caller's job.
- **Atomicity is a caller invariant.** The writer takes the caller's
  Drizzle transaction handle and inserts inside it. If the surrounding
  tx rolls back, the log row rolls back too.
- **Idempotency.** Append-only logs are non-idempotent by design.
  Double-fires are prevented by the entity tables' own constraints
  (unique slugs, optimistic CAS, etc.) before the request reaches the
  log. Retries that produce zero `changedFields` are absorbed by the
  no-op short-circuit.
- **Reads are out of scope.** E-03-06 owns the history view; this
  module is write-only until then.

## Follow-ups (not this PR)

- DB-level immutability trigger (raises on `UPDATE`/`DELETE` against
  `catalog_change_log`). ADR 0003 calls for "DB-level where feasible";
  the existing inventory ledger doesn't have one either, so we ship the
  application-only surface and add the trigger as a separate migration.
- Read service / endpoints — E-03-06.
- Backfill of pre-existing catalog rows — out of scope; history starts
  at deploy time.
