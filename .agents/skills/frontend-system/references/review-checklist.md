# Frontend Review Checklist

## Architecture

- React Query owns client-side server data and cache lifecycle.
- Zustand owns only client-side UI or workflow state.
- TanStack Form owns form state, validation, and submission flow.
- TanStack Table owns sorting, row models, and table interaction state.

## Design system

- The screen uses existing shadcn primitives before custom markup.
- Brand-level composition lives in `components/system`.
- No raw palette utility classes, ad hoc hex values, `space-x-*`, or `space-y-*` exist in frontend source.
- The result feels specific to this product, not like a generic generated dashboard.

## Resilience

- Loading, empty, error, and pending states are present where required.
- Error handling surfaces safe, actionable copy and uses shared problem-details parsing when available.
- Interactive controls prevent duplicate submission or unsafe repeated actions.

## Verification

- Tests cover the new behavior.
- `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm verify` have been run when practical.
