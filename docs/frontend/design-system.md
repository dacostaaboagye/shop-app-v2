# Frontend Design System

This frontend uses `shadcn/ui` with the `base-nova` style as a component source baseline, not as the final product identity.

## Product Character

The interface should feel:

- clear rather than theatrical
- operationally trustworthy rather than playful
- warm and premium rather than sterile
- quiet under load, with clear recovery and feedback states

Avoid editorial marketing language, default SaaS aesthetics, purple gradients, and interchangeable dashboard chrome.

## Foundation

- Components come from `apps/web/src/components/ui`
- Application-level layout and page patterns live in `apps/web/src/components/system`
- Client data fetching uses React Query through `apps/web/src/lib/react-query/*`
- Client-only UI state uses Zustand stores under `apps/web/src/store/*`
- Form state uses TanStack Form plus shared wrappers in `apps/web/src/components/forms`
- Tabular state uses TanStack Table plus shared wrappers in `apps/web/src/components/data-table`
- Design tokens live only in `apps/web/src/app/globals.css`

## Non-negotiable rules

- Use semantic tokens and component variants, never raw palette utilities like `text-blue-600`
- Use `gap-*`, never `space-x-*` or `space-y-*`
- Compose with shadcn primitives before inventing custom markup
- Keep corner radii restrained. Prefer sharper `md` or `lg` surfaces over oversized rounded treatments unless the interaction clearly needs softer geometry.
- Use React Query for client-side remote data, never ad hoc fetch state machines in component trees
- Use Zustand for client-only UI state, never for server cache duplication
- Use TanStack Form for non-trivial forms, never manual field orchestration with scattered `useState`
- Use TanStack Table for table state, sorting, and row modeling
- `Card` uses full composition when a section has a title or footer
- Dialog and sheet components must always include titles
- Error, empty, loading, and offline-adjacent states are part of the feature, not polish

## Typography

- Body uses the sans stack defined in CSS variables
- Major headings use the heading stack
- Headings should be compact and decisive, not oversized for spectacle alone
- Operational copy should stay plain and legible

## Color and surfaces

- The palette is warm neutral with teal emphasis and copper support
- Primary actions use the primary token
- Neutral surfaces should carry depth through layered surfaces and shadow, not arbitrary borders everywhere
- Let surfaces feel premium through material, spacing, and shadow before adding more curvature
- Destructive states must use the destructive token path consistently

## Responsive behavior

Every new page or component must work at:

- `320px`
- `375px`
- `768px`
- `1280px+`

Required behaviors:

- actions wrap before they overflow
- dense layouts collapse into a single column naturally
- side content drops below primary content on smaller screens
- text remains readable without horizontal scrolling

## Resilience states

Every interactive screen should plan for:

- loading: `Skeleton`, `Spinner`
- empty: `Empty`
- soft warning: `Alert`
- hard failure: shared error state components and retry paths
- disabled or pending actions: button disabled state plus visible status cue

Client-data rules:

- Query functions return typed data and throw the shared `ApiError`
- Client fetches should go through `fetchJson` unless a feature-specific wrapper adds value
- Query cache lifecycle belongs to React Query, not Zustand
- Optimistic or workflow-local UI state may live in Zustand when it is not server truth

## Component selection

- page actions: `Button`
- state summaries: `Card`, `Badge`, `Alert`
- forms: TanStack Form + `AppFormField` + `FieldGroup`, `Input`, `Textarea`
- tables: `AppDataTable` + TanStack Table + shadcn `Table`
- separators and rhythm: `Separator`
- overlays: `Dialog`, `Sheet`
- identity snippets: `Avatar`
- navigation segmentation: `Tabs`
- fallbacks: `Empty`, `Skeleton`, `Spinner`

## What agents should extend

- Add new primitives through shadcn CLI when needed
- Add app-specific patterns under `components/system`
- Extend the React Query, TanStack Form, TanStack Table, and Zustand house wrappers before creating a new frontend state pattern
- If a component needs a new visual rule, change the token or wrapper, not every usage site
