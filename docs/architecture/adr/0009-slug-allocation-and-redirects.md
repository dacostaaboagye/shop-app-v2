# ADR 0009: Slug Allocation Uses Retired-Slug History

## Status

Accepted

## Context

`E-00D-03` requires a shared slug generation mechanism plus redirect retention when public identifiers change. The repo already had slug columns and a `slug_redirects` table, but no runtime service was enforcing allocation rules consistently.

## Decision

- Slug allocation is handled by a shared backend service instead of ad hoc per-module helpers.
- Candidate slugs are normalized to lowercase kebab-case and allocated deterministically with numeric suffixes.
- Allocation checks both active slugs and retired `slug_redirects.old_slug` values.
- Slug changes keep the old slug by appending a redirect record; retired slugs are never reused.
- Redirect resolution follows retained history until it reaches the currently active slug.

## Consequences

- Registration and future write paths use one identifier policy instead of inventing local slug logic.
- Public URLs can survive slug changes without exposing internal IDs.
- Redirect history becomes part of the identifier contract and must be written transactionally with the owning aggregate update.
