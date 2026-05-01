---
name: frontend-system
description: Apply this repo's frontend conventions when working in apps/web — Next.js 16 routes, design-system tokens, shadcn primitives, TanStack Form/Table, React Query, Zustand. Invoke when editing apps/web/**, building or reviewing UI, adding a route or form or table, touching tokens in globals.css, or when the user asks for a frontend change. Worker portal must stay mobile-first.
---

# Frontend system

Stack: Next.js 16 App Router + shadcn/ui + React Query + TanStack Form/Table + Zustand. Tokens in `apps/web/src/app/globals.css`. House wrappers in `apps/web/src/components/system`.

## Before touching anything

1. Read `docs/frontend/design-system.md` and `docs/frontend/agent-rules.md` — those define the non-negotiables. This skill assumes them.
2. Grep the existing surface for the thing you're about to build. If a wrapper, hook, or pattern already exists, use it.
3. If the work touches the **worker portal** (`apps/web/src/app/worker/**`), build mobile-first — workers use phones in the field.

## Where everything lives

| Concern | Path |
|---|---|
| App routes per portal | `apps/web/src/app/{admin,manager,worker,supplier,agent}/**` |
| Auth routes | `apps/web/src/app/{login,register,forgot-password,reset-password,verify-email,no-access}/**` |
| House wrappers (page-level + branded) | `apps/web/src/components/system/**` |
| shadcn primitives | `apps/web/src/components/ui/**` |
| Form wrappers (TanStack Form) | `apps/web/src/components/forms/**` — use `AppFormField` |
| Table wrappers (TanStack Table) | `apps/web/src/components/data-table/**` — use `AppDataTable` |
| Client fetches (React Query) | `apps/web/src/lib/react-query/<feature>.ts` |
| Shared fetch helpers | `apps/web/src/lib/react-query/fetch-json.ts`, `fetch-file.ts` |
| Client-only UI state | `apps/web/src/store/**` (Zustand) |
| Tokens (the only place) | `apps/web/src/app/globals.css` |

## Operation playbooks

### Adding a new route under a portal

1. Create the page at `app/<portal>/<segment>/page.tsx`. Compose with `components/system/*` shells, not bespoke layouts.
2. Server-rendered shell + a client component (`*-page-client.tsx`) when the page needs query state, mutations, or interactive state.
3. Authorization is enforced server-side via `config.access` on the API. Frontend gating is UX only.
4. URL state for list filters, pagination, and tab selection — not Zustand.

### Adding a client query

1. Add the typed query hook in `lib/react-query/<feature>.ts`. Reuse `fetchJson` (returns parsed JSON, throws shared `ApiError`) or `fetchFile` for binary.
2. Consume via `useQuery` / `useSuspenseQuery` in the page client. Never duplicate cache state into Zustand.
3. Wire empty + loading + error states using `AppEmptyState`, `Skeleton`, `AppErrorBanner` / `AppErrorState`. These are part of the feature, not polish.

### Adding a form

1. Use TanStack Form via `AppFormField` from `components/forms/`. Don't hand-roll fields with `useState`.
2. Submit through a React Query mutation. Show pending state on the submit button; reflect errors via the shared error wrappers.
3. If the form has more than ~6 fields or branching, split into `<form-name>.support.ts` for schema and helpers.

### Adding a table or list page

1. Use `AppDataTable` (`components/data-table/app-data-table.tsx`) + TanStack Table.
2. Pagination via `app-pagination.tsx`. Sort/filter state belongs in URL search params.
3. For mobile (worker portal especially), provide a stacked-card fallback under `md:` — tables don't survive 320px.

### Touching tokens

1. Tokens live only in `globals.css`. Don't introduce hex in `.tsx`.
2. If a usage site needs a new visual rule, change the token or the wrapper — never the usage site.
3. The character to keep: clear, operationally trustworthy, warm and premium, quiet under load. Avoid SaaS-default purple gradients and editorial copy.

## Hard "don't" list (fast pattern matches)

- No raw Tailwind palette utilities (`text-blue-600`, `bg-red-100`). Use semantic tokens.
- No `space-x-*` / `space-y-*`. Use `gap-*` on flex/grid.
- No hex values in `.tsx`.
- No ad-hoc `useState` fetch state machines. React Query owns server state.
- No mirroring server data into Zustand.
- No manual field orchestration with scattered `useState`. TanStack Form via `AppFormField`.
- No `Card` without composition (title/footer when the section has them).
- No `Dialog` or `Sheet` without a title (visually hidden is fine if needed).
- No hover-only interaction cues — touch users get nothing.
- No styling product screens with standalone `.tsx` islands full of utility strings. Extract to `components/system` if the pattern repeats.

## Mobile-first checklist (especially worker portal)

- Test mentally at 320, 375, 768, 1280.
- Action rails wrap before they overflow.
- Side content drops below primary on small screens.
- Tap targets ≥ 44×44.
- No horizontal scroll for text content.
- Tables collapse to stacked cards under `md:`.

## Resilience checklist

Every async surface has all four:

- **loading** — `Skeleton` or `Spinner`
- **empty** — `AppEmptyState`
- **error** — `AppErrorBanner` (inline) or `AppErrorState` (whole-screen), consuming the shared problem-details shape with request reference when available
- **disabled / pending** — button disabled state plus visible status cue

## Done checklist before pushing

1. `pnpm guard` — frontend-style guard catches palette utilities, `space-x-*`, hex in tsx, file-length.
2. `pnpm --filter @shop/web typecheck` and `lint`.
3. Run `pnpm --filter @shop/web dev`, exercise the path in the browser, verify mobile width (DevTools 375px) for any worker-portal change.
4. Tests live next to the file: `<name>.test.ts` / `<name>.test.tsx`. Use `<name>.support.ts` for non-trivial helpers when the file approaches 250 lines (350 for tests).
