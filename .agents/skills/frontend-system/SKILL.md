---
name: frontend-system
description: Implement and review frontend work in this repository. Use when editing `apps/web`, frontend routes, design-system tokens, tables, forms, client-side data fetching, or client-side state. Apply the shared stack exactly: shadcn primitives, React Query for client fetches, TanStack Form for forms, TanStack Table for tables, Zustand for client-only UI state, and the repo design-system and resilience rules.
---

# Frontend System

Read `docs/frontend/design-system.md`, `docs/frontend/agent-rules.md`, and [references/patterns.md](./references/patterns.md) before substantial frontend work.

## Workflow

1. Read the design-system and agent-rule docs first.
2. Inspect the closest existing wrapper under `components/ui`, `components/system`, `components/forms`, `components/data-table`, `lib/react-query`, or `store`.
3. Choose the correct state owner before writing code.
4. Implement responsive, resilient UI through the shared wrappers.
5. Add or update tests for every behavior change.
6. Run formatting, linting, typechecking, tests, and verification before handoff when practical.

## Choose the state owner

- If the state is server-owned and fetched on the client, use React Query.
- If the state is purely local UI or workflow state, use Zustand.
- If the state is form input, validation, touched state, or submission state, use TanStack Form.
- If the state controls sorting, row models, or table interaction, use TanStack Table.
- If a change needs two owners, stop and justify the split explicitly in code comments or docs.

## Deliver UI

- Compose from `apps/web/src/components/ui/*` first.
- Use `apps/web/src/components/system/*` for page-level branded patterns.
- Change `apps/web/src/app/globals.css` for token or shared visual-rule updates.
- Keep shared surfaces visually taut. Default to restrained radii and reduce oversized rounded treatments unless there is a strong product reason.
- Keep screens responsive at 320px, 375px, 768px, and desktop widths.

## Use the correct state owner

- Use React Query for client-side remote data.
- Use `fetchJson` and the shared query client defaults unless a feature-specific wrapper is necessary.
- Use Zustand only for client-only state such as density, drawers, local workflow steps, and unsaved UI preferences.
- Do not duplicate server data into Zustand.

## URL state — architectural requirement

Every list page (filtered tables, search surfaces) MUST sync its state to the URL.

- **Filters and search**: always write to URL via `router.replace`. Use `useSearchParams()` to read.
- **Pagination**: always write the current page to `?page=N` (1-indexed). Omit `page` from the URL when it equals 1.
- **Sorting**: write as `?sort=field&dir=asc` when active.
- Use `router.replace` (not `push`) to avoid polluting browser history on every filter keystroke.
- Pass `{ scroll: false }` on filter/sort changes to prevent scroll-to-top.
- Debounce text search URL writes (300–400ms). Use a local `useState` for the input value; debounce the URL write via a `useRef` timer.
- Discrete filters (selects, checkboxes) update the URL immediately on change.
- Changing any filter MUST reset `page` to 1 (remove it from the URL).

## Pagination — always server-side

- Page components read `page`, `search`, and filter params from the URL.
- They fetch (or simulate) the current page from the data source.
- They pass `{ page, pageSize, totalCount, onPageChange }` to `AppDataTable`'s `pagination` prop.
- `AppDataTable` renders consistent pagination controls from these props — no client-side slicing inside the table.
- Client-side filtering (mock data, small static lists) MUST still follow this pattern so the swap to a real API requires only changing the data source, not the pagination or URL logic.

## Build forms and tables

- Build forms with TanStack Form and the wrappers in `apps/web/src/components/forms/*`.
- Build tables with TanStack Table and `AppDataTable`.
- Do not introduce alternate form or table state abstractions unless architecture docs are updated first.
- Put shared form concerns in wrappers instead of repeating label, description, and error markup.
- Put shared table concerns in `AppDataTable` instead of rebuilding sorting, empty states, and density rules per screen.

## Ship resilience with the feature

- Every async surface needs loading, empty, error, and disabled or pending states.
- Surface backend failures through the shared problem-details contract when available.
- Keep copy specific and recoverable. Do not leak unsafe internals.
- Add tests for new wrappers and behaviors.

## Read these references when needed

- Read [references/patterns.md](./references/patterns.md) for stack ownership and file locations.
- Read [references/review-checklist.md](./references/review-checklist.md) before handing frontend work to another agent.
