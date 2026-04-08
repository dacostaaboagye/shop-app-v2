# ADR 0002: Public Identifiers Are Not Internal IDs

## Status

Accepted

## Context

The backlog repeatedly prohibits exposing internal IDs. External APIs and URLs must use slugs or generated references instead.

## Decision

- Internal tables may use UUID primary keys
- Public APIs return slugs, codes, and references
- Any entity with a user-facing URL or lookup path must define a public identifier strategy
- Slug changes require redirect retention; old slugs are never reused

## Consequences

- DTO design becomes a first-class architectural concern
- We can rotate or migrate internal persistence keys without breaking clients
- Route contracts stay aligned with the workbook's security and traceability constraints

