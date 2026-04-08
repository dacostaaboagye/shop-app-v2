# Public Identifier Schema

Backlog ticket: `E-00D-03`

This document records the persistence and runtime shape for slug allocation and redirect retention.

## Tables

### `slug_redirects`

Append-only redirect history for public slugs that changed.

- `id`: internal UUID primary key.
- `entity_type`: logical aggregate type that owns the slug, such as `user`, `role`, or `location`.
- `entity_uuid`: stable public UUID of the aggregate whose slug changed.
- `old_slug`: previously active slug. This slug is permanently retired once inserted here.
- `new_slug`: replacement slug that clients should follow.
- `created_at`: redirect creation timestamp.

Constraints and indexes:

- unique `(entity_type, old_slug)` so a retired slug can never be reissued
- check constraint preventing `old_slug` and `new_slug` from being identical
- index on `(entity_type, new_slug)` for redirect-chain traversal
- index on `(entity_type, entity_uuid)` for future aggregate-level cleanup or reporting

## Runtime rules

- Slug allocation checks both active entity slugs and `slug_redirects.old_slug`.
- Human-entered names are normalized into lowercase kebab-case.
- Collisions are resolved deterministically with numeric suffixes such as `-2`, `-3`, and so on.
- Slug changes must update the aggregate record and append the redirect row in the same transaction.
- Redirect resolution follows retained history until it lands on an active slug.

## Current scope

The shared allocator currently supports the slugged aggregates already present in the foundation schema:

- `users`
- `roles`
- `locations`

## Supporting artifacts

- Schema source: [infrastructure.ts](/D:/work/personal/shop-app/shop-app-v2/packages/database/src/schema/infrastructure.ts)
- API runtime: [slug.service.ts](/D:/work/personal/shop-app/shop-app-v2/apps/api/src/modules/public-identifiers/slug.service.ts)
- Postgres adapter: [postgres-slug.repository.ts](/D:/work/personal/shop-app/shop-app-v2/apps/api/src/modules/public-identifiers/postgres-slug.repository.ts)
