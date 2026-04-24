# Frontend Agent Rules

Agents working on the frontend must follow these rules exactly.

## Before starting UI work

- Read `docs/frontend/design-system.md`
- Read `docs/engineering/typescript-javascript-rules.md`
- Check `apps/web/components.json`
- Reuse existing `components/ui` and `components/system` modules before creating new ones
- Reuse the repo skill at `.agents/skills/frontend-system/SKILL.md` for frontend delivery conventions

## Composition rules

- Use shadcn primitives for controls and states
- Use `components/system` for page structure and branded composition
- Use `components/data-table/app-data-table.tsx` for tables
- Use `components/forms/*` wrappers for TanStack Form fields and submit behavior
- Use `lib/react-query/*` for client fetches and query client configuration
- Use `store/*` Zustand stores only for client-only UI and workflow state
- Do not style product screens with standalone `.tsx` islands full of ad hoc utility strings
- If the same layout pattern appears twice, extract it

## Design rules

- No raw palette utility classes
- No hardcoded hex values in `.tsx`
- No `space-x-*` or `space-y-*`
- Avoid perfectly symmetrical, template-looking dashboards unless the feature truly demands it
- Use meaningful hierarchy: kicker, heading, support copy, action rail, content blocks

## Responsiveness rules

- Build mobile-first
- Test mentally at 320, 375, 768, and desktop widths
- Wrap action rails and badge rows
- Never rely on hover as the only interaction cue

## Resilience rules

- Every async surface needs at least one loading, empty, and error state
- Frontend error display must consume the shared problem-details shape where possible
- Keep user-facing error copy calm, specific, and recoverable
- Do not mirror server data into Zustand when React Query is the correct cache owner

## Accessibility rules

- Buttons, inputs, tabs, dialogs, and sheets must use accessible primitives from the library
- Preserve visible focus states
- Use titles for overlays even if visually hidden
- Keep keyboard navigation intact when composing wrappers

## Review checklist

- Does the screen match the established design language?
- Does it look intentional rather than generated?
- Does it remain usable on narrow screens?
- Are failure and empty states present?
- If it fetches on the client, is React Query the owner?
- If it captures client-only view state, is Zustand the owner?
- If it renders a form or table, does it use the shared TanStack wrapper path?
- Are shadcn and system wrappers used correctly?
