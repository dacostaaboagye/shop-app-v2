# ADR 0019: Frontend Overhaul Uses Semantic Tokens And Runtime Brand Mapping

## Status

Proposed

## Context

The frontend has grown through multiple delivery slices without one enforced
presentation system across admin, manager, worker, supplier, auth, document,
sales, and settings surfaces.

That is now visible in production-facing behavior:

- inconsistent layouts, spacing, and action hierarchy
- duplicate page patterns and ad hoc wrappers
- inconsistent loading, empty, and error states
- internal references such as request IDs shown directly to end users
- uneven handling of long content, dense tables, and growing forms
- inconsistent money, quantity, and date presentation
- inconsistent location, status, and workflow wording
- theme styling that does not yet resolve cleanly from brand configuration
- pages that are functionally correct but do not yet meet one accessibility,
  resilience, responsiveness, and performance bar

The current problem is not limited to isolated components. It is now a
system-level quality issue, so the rewrite must be governed as architecture,
not as scattered page cleanup.

## Decision

- The frontend will be overhauled as a controlled workstream, not as ad hoc
  page-by-page polishing.
- Semantic design tokens become the only supported styling contract for product
  screens. Feature code may not depend on raw palette utilities or direct hex
  values.
- Typography becomes a governed system with explicit rules for:
  - heading hierarchy
  - body copy hierarchy
  - label and helper text usage
  - tabular and numeric emphasis
  - consistent font-family usage across portals
- Brand configuration will not style components directly. Instead:
  - persisted brand configuration resolves into a constrained runtime theme map
  - the runtime theme map sets CSS custom properties
  - components consume only semantic tokens
- User-facing screens must not expose internal operational references such as
  request IDs by default. Internal references may appear only in explicitly
  developer-facing or support-oriented surfaces.
- Shared formatting rules become mandatory for:
  - money
  - percentages
  - quantities
  - dates and times
  - identifiers and references
  - status presentation
- Every async page and workspace must ship with:
  - loading state
  - empty state
  - error state
  - pending-action state
- Every rewritten screen must satisfy one common quality bar for:
  - responsiveness
  - accessibility
  - resilience
  - performance
  - content discipline

## Implementation Rules

- The work proceeds in this order:
  1. document the target system and audit the current frontend
  2. implement token, type, and theme infrastructure
  3. standardize shared wrappers and display helpers
  4. migrate page families in slices
  5. remove deprecated frontend patterns
- Shared wrappers under `apps/web/src/components/system` and
  `apps/web/src/components/ui` are the only place to encode presentation rules
  used across multiple screens.
- Typography and color rules must be expressed through semantic tokens and
  shared wrappers, not page-level one-off classes.
- Client-side error rendering must distinguish:
  - safe user-facing detail
  - optional internal support references
  - developer-only debug context
- Money and similarly sensitive business values must come from shared display
  helpers, not hand-built interpolation inside pages.
- Pages must handle long content intentionally through wrapping, truncation,
  stacking, or progressive disclosure. Overflow may not be left to chance.

## Consequences

- Some existing pages will need decomposition before visual migration because
  file-size and ownership boundaries are already weak.
- Shared tokens and runtime theme mapping will likely require changes in
  `globals.css`, settings contracts, and brand configuration resolution.
- Frontend delivery will temporarily slow down while the shared system is being
  enforced, but later page work will be faster and safer.
- Existing user-visible noise, including request IDs shown in normal error
  states, becomes a tracked defect class and must be removed during the
  overhaul.
- The rewrite will be delivered in explicit backlog slices rather than a single
  long-lived “rewrite everything” branch.
