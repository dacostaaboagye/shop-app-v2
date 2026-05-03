# Agent Working Agreement

This repository is designed for multiple agents to work safely in parallel. Follow these rules exactly.

## Codex sessions

- Codex-specific orchestration lives in `CODEX.md`.
- Codex agents must read `CODEX.md` after this file for project-scoped delivery workflow, standing subagent routing, specialist-role gates, and Claude-orchestration boundaries.
- The project owner has explicitly requested standing Codex subagent orchestration for this repository; do not require a per-session reminder before using subagents for non-trivial delivery work when the subagent tool is available.
- Do not modify `.claude/**` orchestration when adding or updating Codex-specific behavior.

## Execution model

- Work from backlog ticket IDs. Every change must reference at least one ticket in the branch name, PR body, or commit message.
- Do not mark a backlog item complete until every acceptance criterion and definition-of-done item has evidence in code, tests, or docs.
- Prefer extending an existing module over creating a new top-level abstraction.

## Architectural rules

- Route handlers may validate input, call application services, and map responses. They may not contain business workflows or direct SQL.
- Public responses must use slugs, reference numbers, or UUIDs explicitly approved by the backlog. Internal surrogate IDs stay server-side.
- Permissions are enforced at the API boundary. Hiding a button in the frontend is never access control.
- Immutable records stay immutable. Ownership ledgers, audit trails, and permission history are append-only by default.
- Cross-domain communication goes through explicit service interfaces or contracts. Do not reach into another module's private tables or helpers.

## Quality gates

- Add or update tests with every behavior change.
- Add or update ADRs when changing architectural direction.
- Run `pnpm guard` before opening a PR for backend changes.
- Run `pnpm verify` before handing work to another agent when practical.
- Preserve the shared error contract. Backend errors return structured problem details; frontend error states must surface a safe, actionable message.
- Follow `docs/engineering/typescript-javascript-rules.md` for operator, fallback, and typing patterns.
- Keep implementation files small. Source files over 250 lines and test files over 350 lines must be split unless the architecture docs are updated deliberately.

## Frontend rules

- Read `docs/frontend/design-system.md` and `docs/frontend/agent-rules.md` before significant UI work.
- Read `.claude/skills/frontend-system/SKILL.md` for operation playbooks (route, query, form, table) and the hard don't-list.
- Frontend work uses shadcn components as primitives and `apps/web/src/components/system` for house patterns.
- Client-side data fetching uses React Query through the shared query client and fetch helpers.
- Client-side UI state uses Zustand only when the state is not server-owned data.
- Forms use TanStack Form through the shared field wrappers.
- Tables use TanStack Table through `AppDataTable`.
- Do not introduce raw Tailwind palette classes, `space-x-*`, `space-y-*`, or ad hoc hex colors in frontend source.
- Every async screen must account for loading, empty, and error states.

## Folder ownership

- `apps/api/src/modules/*` owns backend use cases and route composition per domain
- `apps/web/src/app/*` owns UI routes and shell composition
- `packages/database/src/schema/*` owns persistence definitions and table conventions
- `packages/contracts/src/*` owns public request and response contracts
- `docs/architecture/*` owns system-level decisions and standards

## Review checklist

- Are protected routes tagged with access metadata?
- Are public DTOs free of raw `id` fields?
- Are writes transactional where the backlog requires atomicity?
- Does the change preserve append-only history where applicable?
- Is the ticket's definition of done fully evidenced?
