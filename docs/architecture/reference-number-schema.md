# Reference Number Schema

Backlog ticket: `E-00D-04`

This document records the persistence and runtime contract for transactional
reference numbers.

## Persistence

### `sequence_counters`

Atomic counter storage for channel-specific reference sequences.

Columns:

- `sequence_key`: stable counter key, unique per sequence stream
- `current_value`: last issued integer for that stream
- `description`: optional operator-facing description of the stream
- `created_at`, `updated_at`: audit timestamps for sequence setup and changes

Runtime notes:

- invoice references use one persistent counter per channel
- date-scoped references use one counter per channel per UTC day
- counters never decrement or reuse previously issued values

## Runtime formats

- POS invoice: `INV-POS-{5digit}`
- portal invoice: `INV-CPO-{5digit}`
- e-commerce invoice: `INV-WEB-{5digit}`
- manual invoice: `INV-MAN-{5digit}`
- credit note: `CRN-{parent invoice ref}`
- portal order: `CPO-{YYYYMMDD}-{4char}`
- e-commerce order: `WEB-{YYYYMMDD}-{4char}`
- delivery item: `DEL-{YYYYMMDD}-{4char}`
- purchase order: `PO-{YYYYMMDD}-{4char}`

Implementation notes:

- invoice counters are formatted as zero-padded decimal values
- date-scoped suffixes are derived from a UTC-day-local base36 counter padded to
  a minimum width of four characters
- credit notes are deterministic derivatives of the parent invoice reference and
  do not consume a separate counter

Primary code references:

- service: [reference-number.service.ts](/D:/work/personal/shop-app/shop-app-v2/apps/api/src/modules/public-identifiers/reference-number.service.ts)
- postgres adapter: [postgres-reference-number.repository.ts](/D:/work/personal/shop-app/shop-app-v2/apps/api/src/modules/public-identifiers/postgres-reference-number.repository.ts)
