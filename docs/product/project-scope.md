# Project Scope

Source workbook: `Building and Refining Product Backlog.xlsx`

## Problem shape

- The business operates physical stores and warehouses.
- Inventory accountability is weak, losses are hard to trace, and worker
  responsibility is difficult to prove.
- The online shop shares warehouse stock with store and delivery workflows.

## What the backlog is actually optimizing for

This is not a CRUD-first backlog. The workbook is building a control system for
inventory, permissions, and traceability first, then layering user-facing
surfaces on top of those primitives.

Foundation themes extracted from the workbook:

- identity, authentication, and immediate access revocation
- permission resolution at the API boundary on every protected route
- public identifiers: slugs, redirect retention, and reference numbers
- append-only ownership history for worker accountability
- stock balances and reservation locking to prevent overselling
- portal shells and admin workflows only after the foundation is trustworthy

Inventory interpretation used in this repo:

- quantity-bearing records attach to SKU, not the higher-level product shell
- ownership, stock balances, and reservations therefore share `sku_id`

## Delivery order reflected in the repo

- `E-01-01`: auth and session management
- `E-00D-01` to `E-00D-04`: access control, slugging, and reference-number
  infrastructure
- `E-00A-01` to `E-00A-05`: ownership ledger, queries, writers, handovers, and
  sales attribution
- `E-00A-06`: ownership history admin API
- `E-00B-01` to `E-00B-07`: stock balance, reservations, expiry, adjustments,
  sync, and admin reservation visibility
- `E-00C-01` to `E-00C-05`: delivery data model, creation, transitions,
  assignment, and API surface
- `E-00D-05` to `E-00D-07`: portal routing, permission admin APIs, and
  developer enforcement tooling
- `E-01-*`: login, portal, and admin surfaces once the backend primitives exist

## Current execution priority

- foundation auth, access, ownership, stock runtime, and location/admin shells
  are already substantially ahead of the original repo summary
- the next implementation focus is `E-03-01` product-catalog foundation so the
  system can stop treating catalog work as placeholder screens
- delivery runtime tickets `E-00C-02` to `E-00C-05` remain open, but they are
  no longer the immediate next slice

## Current repository reading

- auth, access-control, slug infrastructure, and reference-number infrastructure
  are in place
- inventory ownership foundations through sales attribution are in place and use
  SKU-based identity
- stock balance, availability, reservation lifecycle, expiry, movement sync,
  and active-reservation admin API are in place
- delivery persistence exists, but delivery runtime remains a scaffold
- admin access, user-directory, location-management, and portal-shell work are
  materially underway
- catalog runtime is still largely absent, making product-catalog work the most
  valuable next backend and admin-surface investment

## Current backlog reality

- The updated workbook includes more near-term backend tickets than the earlier
  repo summary reflected, especially `E-00A-06`, `E-00B-04` to `E-00B-07`,
  `E-00C-01` to `E-00C-05`, and `E-00D-05` to `E-00D-06`.
- The workbook still phrases quantity-sensitive work in terms of "product", but
  this repo continues to normalize quantity-bearing identity to SKU so stock and
  ownership stay aligned.
- The workbook still describes `effective_to` for ownership in places, but the
  implemented repo direction remains append-only chronology per ADR 0003.
