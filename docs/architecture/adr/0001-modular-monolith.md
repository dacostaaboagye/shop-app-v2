# ADR 0001: Modular Monolith First

## Status

Accepted

## Context

The backlog requires immediate consistency across:

- stock ownership attribution
- stock reservations and confirmations
- permission resolution and revocation
- delivery creation and status transitions

Breaking these into services too early would add distributed transactions, event choreography, and duplicated authorization logic before the product has stable boundaries.

## Decision

We will build a modular monolith with:

- one backend runtime in `apps/api`
- a shared PostgreSQL database
- explicit domain modules with isolated service boundaries
- internal contracts between modules rather than direct table coupling

## Consequences

- We optimize for transactional safety and coherent domain logic now
- We retain the option to extract services later if module seams prove stable
- Scaling concerns are addressed first with vertical scaling, queue workers, read models, and disciplined module boundaries

