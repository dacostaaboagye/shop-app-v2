# CLAUDE.md

Working agreement for Claude Code sessions in this repository. Read this first, then the linked canonical docs before doing significant work.

## Project at a glance

- Monorepo with `apps/api` (Fastify + Drizzle + Postgres on Fly.io), `apps/web` (Next.js 16 on Vercel), and shared `packages/contracts`, `packages/database`, `packages/domain`.
- Modular monolith — see `docs/architecture/adr/0001-modular-monolith.md`.
- Identity is bearer access tokens + HttpOnly refresh-token cookie — see `docs/architecture/adr/0006-browser-session-auth.md`.
- Workers use the app on phones; the worker portal must stay mobile-first.
- Today's date in repo time: see `currentDate` context if provided.

## Canonical docs (read before starting work)

Always read first:

- `AGENTS.md` — multi-agent working agreement; non-negotiable rules.
- `README.md` — repo orientation and command list.
- `docs/engineering/typescript-javascript-rules.md` — operator, fallback, typing, file-size rules.
- `docs/engineering/git-workflow.md` — branch naming, commits, gates, PR flow.

Read before backend work:

- `docs/architecture/README.md` and the relevant ADR.
- `docs/architecture/access-control-schema.md` and `docs/architecture/authentication-schema.md`.
- The schema doc for the domain you're touching (catalog / stock / delivery / public-identifiers / etc.).

Read before frontend work:

- `docs/frontend/design-system.md`
- `docs/frontend/agent-rules.md`
- `.claude/skills/frontend-system/SKILL.md` — operation playbooks + hard don't-list. Auto-invoked on `apps/web` work.

Operational context:

- `docs/engineering/testing-environment-deployment.md` — testing pipeline, secret list.
- `docs/engineering/security-and-auth-audit.md` — current outstanding security findings; consult before any auth/security-adjacent change.

Team workflow (when running multi-stage epics):

- `docs/process/team-orchestration.md` — how this session coordinates PO / backend / frontend / QA / reviewer sub-agents.
- `docs/backlog/README.md` — epic file contract (frontmatter + body sections + status lifecycle).
- `.claude/skills/orchestrate-epic/SKILL.md` — invoked as `/skill orchestrate-epic <id>` (or no id to pick the next ready epic).

## Non-negotiable rules

These restate `AGENTS.md` and `README.md`. If you can't satisfy one, stop and ask.

- Public APIs expose slugs / reference numbers / approved UUIDs, never raw DB ids.
- Authorization is enforced at the route boundary via `config.access` (`docs/architecture/adr/0004-route-enforcement.md`). Frontend gating is UX, never security.
- Append-only ledgers (ownership, audit, permission history) stay append-only. Corrections are compensating events.
- Business logic lives in services and domain modules, never inline in route handlers.
- Cross-domain communication goes through service interfaces or `packages/contracts`, never direct table access.
- Source files ≤ 250 lines, test files ≤ 350 lines. Split before extending.
- Use `??` for fallbacks where `0` / `false` / `""` are valid; `||` only when every falsy value should collapse.
- `===` / `!==` only. Validate required data — never hide a missing invariant behind `?.`.
- No raw Tailwind palette utilities, no `space-x-*` / `space-y-*`, no hex colors in `.tsx`.
- React Query owns server state. Zustand owns client-only UI state. TanStack Form / Table for forms / tables. URL state for list pages.

## Workflow

1. **Branch.** From `dev`. Pattern: `feature/<ticket>-…` | `fix/<ticket>-…` | `chore/ops-…`. Hooks enforce this.
2. **Plan first** for any non-trivial change. Reference the backlog ticket in branch, commit, and PR.
3. **Edit.** Prefer extending existing modules over new top-level abstractions.
4. **Test.** Add or update tests with every behavior change.
5. **Validate locally** before pushing:
   - `pnpm guard` — route-access, public-id, frontend-style, file-length guards.
   - `pnpm verify` — `validate` (guards + lint + typecheck + tests) + build.
6. **Commit.** Conventional commits with the ticket as scope: `feat(e-00b-02): …` or `fix(ops): …`. The `commit-msg` hook enforces this.
7. **PR into `dev`.** Squash-merge. `main` is release-only.

Hooks live in `.husky/` and run `pnpm enforce:branch-name`, `pnpm guard`, `pnpm lint` on `pre-commit`, and `pnpm verify` on `pre-push`. Do not skip hooks.

## Useful commands

```bash
pnpm install
pnpm dev                          # api + web + events, each Infisical-wrapped, in parallel
pnpm dev:api:infisical            # single-app variant (api only)
pnpm dev:web:infisical            # single-app variant (web only)
pnpm dev:events:infisical         # single-app variant (events worker only)
pnpm dev:bare                     # turbo dev without Infisical — rare
pnpm guard                        # architecture guards
pnpm verify                       # validate + build
pnpm deploy:testing:bootstrap     # migrate + seed core
pnpm deploy:testing:seed-admin    # idempotent super-admin seed
```

## Working with code

- Use the dedicated tools (Read / Edit / Glob / Grep) over shell text-processing.
- Make minimal, targeted edits. No surrounding cleanup beyond the task.
- Don't write comments that restate code. Only the non-obvious "why" — a hidden constraint, an audit finding, a workaround.
- Don't create planning, summary, or analysis files unless asked. Audit and ADR docs are exceptions and live under `docs/`.
- For UI changes, run the dev server and exercise the path in the browser before reporting done.

## Risky actions — confirm first

- Force pushes, hard resets, branch deletes, dropping migrations.
- Pushing, opening / closing PRs, merging, posting to external services.
- Anything that bypasses hooks (`--no-verify`, `--no-gpg-sign`).
- Editing `settings.json`, `turbo.json`, `biome.json`, `tsconfig.base.json`, `pnpm-lock.yaml` — these invalidate Turbo cache and affect every package.

If you hit an obstacle, fix the root cause. Don't bypass safety checks to make it go away.

## Security guardrails (active)

The audit at `docs/engineering/security-and-auth-audit.md` is largely remediated (statuses verified 2026-07-11); the C2 residual (credential rotation) is tracked in `docs/engineering/production-readiness-plan.md`. Don't regress the shipped fixes:

- Do not reintroduce silent OAuth linking in the auth user resolver — C1 fix (PR #38) must hold.
- Do not loosen CORS (`apps/api/src/server/create-server.ts`) — the C3 fix (PR #36) rejects unknown browser origins; keep default-deny.
- Do not add new cookie-authed state-changing endpoints without explicit CSRF design (M3 — regression smoke test still pending).
- Do not add `console.error(err)` with full Error objects; use explicit fields / `error.message` only (M7, M8 fixes must hold).
- The credentials that sat in `.env.local` (Neon, R2, Google OAuth, Resend) are unrotated until C2 closes; never paste secrets into chat / logs / PRs.

## Reading order recap

1. `CLAUDE.md` (this file).
2. `AGENTS.md`, `README.md`.
3. `docs/engineering/typescript-javascript-rules.md`, `docs/engineering/git-workflow.md`.
4. The ADR or schema doc for the domain you're about to touch.
5. For frontend: design-system, agent-rules, frontend-system skill.
