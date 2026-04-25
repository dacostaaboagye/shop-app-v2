# Frontend Overhaul Workstream Plan

Last updated: 2026-04-25

Backlog umbrella: `FE-01`

## Current Progress

- `FE-01A` completed
- `FE-01B` in progress
- `FE-01C` in progress
- `FE-01D` in progress
- `FE-01E` started with stock and transfer workspaces

Current migrated surfaces:

- shared user-facing error handling
- page shells and brand-aware sidebar chrome
- shared display and status formatting
- shared form density and feedback surfaces
- manager and worker transfer workspaces
- manager stock, reservations, and worker stock screens
- admin stock and admin catalog product list surfaces
- admin catalog table cell surfaces for products, brands, and categories
- admin catalog detail headers, skeletons, and detail cards
- admin catalog create and edit form surfaces

## Goal

Rewrite the frontend to enforce one consistent system for:

- visual language
- font hierarchy and font-family consistency
- color governance and semantic color usage
- content discipline
- resilience states
- accessibility
- responsiveness
- performance
- runtime theming from brand configuration

This is not a cosmetic pass. It is a system rewrite for every frontend page
family and shared surface.

## Non-Negotiable Rules

- no raw palette classes in feature code
- no direct brand colors inside page components
- no ad hoc font choices or page-level type scales outside shared tokens
- no internal request references shown to end users by default
- all money goes through shared formatting helpers
- all async pages ship with loading, empty, error, and pending states
- all tables go through shared table patterns unless an ADR justifies an
  exception
- all forms go through shared form wrappers
- all rewritten screens must be checked for narrow and wide layouts

## Workstream Slices

### `FE-01A` frontend audit and target architecture

Deliverables:

- repo-wide frontend audit
- architectural ADR for semantic tokens and runtime brand mapping
- migration rules for page families and shared wrappers

Definition of done:

- problem areas are grouped by page family and system layer
- unnecessary user-facing information classes are documented
- the quality bar for rewritten pages is explicit

### `FE-01B` semantic token and runtime theme foundation

Deliverables:

- semantic token inventory
- typography token inventory
- runtime theme map derived from brand configuration
- CSS variable contract for brand-aware surfaces

Definition of done:

- components consume semantic tokens only
- brand configuration is mapped into safe token values
- heading, body, label, helper, and numeric typography are standardized
- contrast-sensitive states remain accessible

### `FE-01C` shared display standards

Deliverables:

- money display helpers
- quantity and unit helpers
- date and time helpers
- status presentation maps
- safe identifier/reference presentation rules

Definition of done:

- sensitive operational data is rendered consistently
- long references and long names have deliberate behavior
- user-facing error displays stop leaking internal-only references

### `FE-01D` shell, page, table, form, and dialog standardization

Deliverables:

- unified page-shell standards
- unified toolbar and filter standards
- standardized table action patterns
- standardized dialog and sheet behavior
- standardized loading and error surfaces
- standardized heading, section-title, and support-copy hierarchy

Definition of done:

- repeated layout patterns are pulled into shared wrappers
- action hierarchy is consistent across portals
- dense operational screens remain usable at mobile and desktop widths

### `FE-01E` page-family rewrites

Order:

1. auth and public access flows
2. admin workspaces
3. manager workspaces
4. worker workspaces
5. supplier/procurement flows
6. sales and document surfaces
7. settings and configuration flows

Definition of done:

- each family meets the shared system rules
- no deprecated wrapper usage remains in migrated files
- each family has focused regression evidence

## First-Class Defects To Fix During The Overhaul

- request IDs shown to end users in normal error states
- duplicated or unclear page wording
- inconsistent heading scale and font usage
- inconsistent color application and low-value visual noise
- screens exposing operational internals without user value
- overflow and truncation failures when content grows
- inconsistent money and quantity presentation
- inconsistent location, status, and action wording
- missing or weak loading, empty, and error states
- table and action menu inconsistency

## Initial Execution Order

1. `FE-01A` architecture and audit
2. `FE-01C` safe error and display standards
3. `FE-01B` token and brand-theme foundation
4. `FE-01D` shared wrapper rewrite
5. `FE-01E` page-family migrations
