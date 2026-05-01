---
id: e-04-01
title: Design pilot — refresh tokens and pilot two flows
status: idea
priority: high
domain: frontend
owner: claude
parents: []
acceptance: []
size: medium
---

## Why

The web app spans five portals (admin, manager, worker, supplier, agent). Workers are mobile-first on phones and the rest are desktop-leaning. We want a deliberate visual + interaction refresh — clearer hierarchy, calmer surfaces, mobile-first density rules — without rebuilding the whole app. The frontend persona will pilot the redesign on one or two representative flows so we can measure the win before rolling out tokens or component changes broadly.

Constraints to respect:

- Existing tokens live in `apps/web/src/app/globals.css`.
- House wrappers live in `apps/web/src/components/system`.
- Design system rules in `docs/frontend/design-system.md` and `docs/frontend/agent-rules.md` are authoritative on color tokens and forbidden Tailwind classes.
- Stack: Next.js 16, shadcn/ui, React Query, TanStack Form/Table, Zustand.
- Character we want: clear, operationally trustworthy, warm and premium, quiet under load.

## Out of scope

- Touching the worker portal until the pilot tokens land (separate epic).
- Rebuilding the catalogue MediaUploader (covered by `e-04-04`).
- Adding new shadcn primitives that aren't already in the registry.

## Proposed pilot scope (PO to confirm)

- Pick **two** representative flows: one mobile-first worker flow + one desktop-leaning manager flow.
- Define a measurable success bar before code: e.g. task-completion time, tap target compliance, contrast pass rate, Core Web Vitals delta.
- Produce token deltas + component change list before the build stage.
