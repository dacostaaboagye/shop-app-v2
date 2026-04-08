# Frontend Patterns

## Stack ownership

- Use React Query for client-side remote data and cache lifecycle.
- Use Zustand for client-only view state, interaction preferences, and transient workflow state.
- Use TanStack Form for form state, validation, and submission orchestration.
- Use TanStack Table for row models, sorting, and table state.

## File paths

- Query client and fetch helpers: `apps/web/src/lib/react-query/*`
- Form wrappers: `apps/web/src/components/forms/*`
- Data table wrapper: `apps/web/src/components/data-table/app-data-table.tsx`
- Zustand stores: `apps/web/src/store/*`
- Page and brand composition: `apps/web/src/components/system/*`

## Delivery rules

- Add tests for each new behavior and wrapper.
- Put design tokens in `apps/web/src/app/globals.css`.
- Prefer changing wrappers and tokens over restyling one-off usage sites.
- Treat error, empty, loading, and pending states as required surface area.
- Keep client data contracts aligned with the shared problem-details error format.
