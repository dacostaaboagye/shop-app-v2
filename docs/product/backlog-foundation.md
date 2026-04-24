# Backlog Foundation Interpretation

This document captures the architectural intent extracted from the workbook `Building and Refining Product Backlog(1).xlsx`.

## Problem statement

- The business operates physical stores and warehouses
- Inventory accountability is weak or absent
- Goods get lost or stolen because movements are not traceable
- Supervisors and inspectors are not consistently accountable
- An online shop interacts with warehouse stock for purchases and delivery

## Architectural pillars encoded in the backlog

The workbook is not asking for generic CRUD first. It establishes system primitives that everything else depends on:

1. Immutable ownership ledger
2. Permission-based authorization with immediate revocation
3. Slug and reference infrastructure for public identifiers
4. Stock balance and reservation services with row-level locking
5. Route-level enforcement tooling to stop future drift

## Required sequencing

### Foundation

- `E-01-01` users, authentication, refresh tokens, lockout handling
- `E-00D-01` permission system schema
- `E-00D-02` permission resolution service
- `E-00D-03` slug generation and redirect infrastructure
- `E-00D-04` reference number generation
- `E-00A-01` stock ownership ledger table
- `E-00A-02` ownership query service
- `E-00A-03` assignment and reassignment writers
- `E-00A-04` handover writers and auto-revert job
- `E-00B-01` stock balance and reservations tables
- `E-00B-02` available stock query
- `E-00B-03` reservation lifecycle service
- `E-00B-05` reservation expiry job
- `E-00D-07` developer enforcement tooling

### Phase 1 surfaces

- authentication UI and portal selection
- user management APIs and admin UI
- location management
- products, search, barcode lookup, and supplier-scoped views
- delivery creation, assignment, and agent portal features

## Non-negotiable workbook constraints

- JWT payloads must not contain roles or permissions
- Protected routes resolve permissions server-side on every request
- Sales attribution must come from ownership history at sale time
- Concurrency-sensitive stock operations require row-level locking
- Public responses use slugs and references rather than raw internal IDs

