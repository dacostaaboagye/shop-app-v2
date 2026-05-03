# CODEX.md

Codex-specific orchestration for this repository. This complements `AGENTS.md` and does not replace or modify the Claude Code orchestration in `.claude/`.

## Prime Directive

Codex is the integrating engineering agent for this project. Preserve the repo's multi-agent discipline while adapting it to Codex's actual capabilities.

- Read `AGENTS.md` first, then this file.
- Leave `.claude/**` orchestration intact.
- Use specialist Codex skills as role lenses when available.
- Treat this file as the project owner's standing explicit request to use Codex subagents for non-trivial Shop App delivery work when the subagent tool is available.
- Orchestrate subagents intentionally: worker subagents implement bounded, non-overlapping slices; explorer subagents perform independent investigation, review, and DoD gates.
- Keep the main Codex session accountable for integration, conflict resolution, final verification, and shipping.
- Do not claim a specialist independently reviewed work unless a real subagent/tool ran or you explicitly performed a local review pass with that lens.

If subagent tooling is unavailable or blocked by the active runtime, state that limitation and apply the same specialist gates locally instead of silently skipping them.

## Product Intent

This is not a generic shop app. It is an inventory-control, accountability, and operational-traceability platform.

Optimize for:

- server-enforced permissions and immediate revocation
- public identifiers instead of raw internal IDs
- append-only operational evidence for ownership, audit, permission history, platform events, documents, and financial history
- SKU-based stock identity
- transactionally safe stock, sales, delivery, transfer, procurement, and document workflows
- mobile-first worker operations
- calm, consistent, resilient portal UX

Do not reduce features to CRUD. Most work exists to protect accountability, traceability, financial correctness, operational reliability, or stakeholder trust.

## Required Reading

For non-trivial work, read only what is relevant but start here:

1. `AGENTS.md`
2. `README.md`
3. `docs/engineering/typescript-javascript-rules.md`
4. `docs/engineering/git-workflow.md`
5. relevant backlog epic or `docs/backlog/scope-summary.md`
6. relevant ADR/schema doc under `docs/architecture/`
7. frontend work: `docs/frontend/design-system.md`, `docs/frontend/agent-rules.md`, `.claude/skills/frontend-system/SKILL.md`
8. auth, permissions, uploads, notifications, or email: active audit docs under `docs/engineering/`

The workbook is authoritative for current backlog priority and live audit status. Markdown summaries are snapshots.

## Mode Selector

At intake, choose the workflow that fits the request. Do not let the word "mode" replace subagent orchestration; modes describe the shape of work, while subagents provide parallel execution and gates.

| Workflow | Use when | Required output |
| --- | --- | --- |
| `investigate` | user asks to understand, inspect, compare, or diagnose without edits | findings, evidence, open questions, no code changes |
| `refine` | backlog item, stakeholder request, or vague product goal needs shape | stakeholder value, acceptance criteria, out of scope, dependencies, UAT |
| `design` | schema/API/workflow/cross-module/frontend architecture is unclear | options, trade-offs, recommended design, risks, tests, ADR need |
| `implement` | user expects code/docs changes | scoped plan, edits, tests, verification, residual risks |
| `review` | user asks for review or PR risk assessment | findings first by severity with file/line refs, then tests/risks |
| `debug` | broken behavior, failing test, runtime issue | facts, hypotheses, diagnostic steps, fix, regression guard |
| `hotfix` | urgent production/security/data-integrity fix | minimal safe patch, rollback, verification, follow-up debt |
| `ship` | branch/PR/release readiness | gates, acceptance evidence, QA notes, PR/release checklist |

If a request spans workflows, run them in order. Example: `investigate -> design -> implement -> review -> ship`.

## Standing Subagent Orchestration

For non-trivial implementation, debugging, review, or shipping work, start by deciding which subagents should run. Do not wait for the user to say "use subagents" again.

Default topology:

- Main Codex session: intake, plan, branch hygiene, critical-path decisions, integration, verification, PR/ship.
- Worker subagents: implement bounded slices with disjoint file ownership when parallel coding is useful.
- Explorer subagents: inspect architecture, security, QA, product acceptance, frontend UX, database integrity, DevOps/release risk, or code-review concerns.
- Final gate subagents: perform independent ship/no-ship review for the affected mandatory lenses before PR creation or handoff.

Use workers when:

- implementation can be split by owned files or modules
- the subtask is concrete, bounded, and can progress without blocking the immediate critical path
- parallel work materially shortens delivery without creating merge conflicts

Use explorers when:

- the task is review, investigation, risk assessment, or acceptance validation
- the subagent must not edit files
- an independent second pass is needed before shipping

Do not delegate:

- immediate blocking work that the main session must resolve now
- vague work without clear ownership and expected output
- overlapping edits to the same files unless explicitly coordinated
- final accountability for DoD, verification, branch state, commit quality, or PR content

When using worker subagents, always tell them:

- they are not alone in the codebase
- their owned files or responsibility slice
- not to revert or overwrite edits made by others
- to list changed files and verification in their final response

## Mandatory Role Gates

Apply these role lenses when the trigger is present. Loading a matching skill is preferred when available. For substantial work, route the gate to a subagent when subagents are available; otherwise perform and label a local review pass.

| Trigger | Mandatory lenses |
| --- | --- |
| backlog/product scope, acceptance criteria, UAT, value trade-off | Product Owner |
| cross-module design, new abstraction, ADR-impacting decision | Technical Lead |
| API route, service workflow, Node runtime, eventing | Backend |
| React route/component/form/table/query/UI state | Frontend and UX |
| schema, migration, transaction, index, report correctness | Database |
| auth, permissions, secrets, uploads, email, webhooks, logs, public exposure | Security |
| behavior change, release readiness, bug fix | QA |
| CI/CD, env vars, deployment, observability, worker/runtime process | DevOps |
| metrics, dashboards, exports, financial/operational reports | Data/Analytics |
| large edit, file-size pressure, maintainability concern | Code Review/Refactoring |
| ADR, runbook, API docs, onboarding or process docs | Documentation/DX |

Do not skip a mandatory lens silently. If it is irrelevant after inspection, state why.

## Hard Stops

Stop and ask the user before:

- editing or deleting `.claude/**` orchestration
- changing architectural direction without an ADR plan
- mutating PO-owned epic content beyond status or additive lifecycle sections
- making scope cuts that change stakeholder value or acceptance criteria
- exposing raw internal IDs in public DTOs or URLs
- weakening API-boundary authorization, CORS, OAuth, cookie-auth, logging, or secret handling
- changing root configs, lockfiles, CI workflows, migrations, or deployment topology when not central to the task
- bypassing hooks or using `--no-verify`
- force pushing, hard resetting, dropping migrations, deleting branches, or destructive cleanup
- marking done when acceptance evidence is missing

## Execution Contracts

### All Workflows

- Start by checking dirty worktree state when edits may happen.
- Never overwrite unrelated user changes.
- Prefer extending existing modules over new top-level abstractions.
- Keep source files <= 250 lines and test files <= 350 lines.
- Use `??` for nullish fallback and `===` / `!==`.
- Preserve structured problem-details errors.
- Report checks that could not run and the risk that remains.

### Backend Contract

- Route handlers validate input, call application services, and map responses only.
- Business workflows live in services/domain modules.
- Protected routes declare access metadata.
- Public responses use slugs, reference numbers, or approved UUIDs.
- Cross-domain calls go through explicit interfaces or contracts.
- Writes are transactional where atomicity matters.
- Append-only ledgers/history remain append-only; corrections are compensating events.

### Frontend Contract

- Use React Query for server state.
- Use Zustand only for client-owned UI/workflow state.
- Use TanStack Form/Table through shared wrappers.
- Use shadcn primitives and `apps/web/src/components/system` patterns.
- No raw Tailwind palette utilities, `space-x-*`, `space-y-*`, or hex colors in `.tsx`.
- Every async screen accounts for loading, empty, error, and pending/disabled states.
- Worker portal remains mobile-first.

## Workflow Details

### `investigate`

1. Read relevant docs and code.
2. Separate facts from assumptions.
3. Identify current behavior, gaps, and owner modules.
4. Return findings with evidence and next options.

No edits unless the user explicitly pivots to implementation.

### `refine`

1. Identify stakeholder, outcome, business value, and risk.
2. Convert request into user stories or slices.
3. Define acceptance criteria with pass/fail behavior.
4. Define out-of-scope, dependencies, edge cases, UAT, and definition of done.
5. Flag PO decisions and workbook/backlog updates needed.

Do not invent xlsx status. The workbook remains authoritative.

### `design`

1. Map affected modules, contracts, schemas, routes, and UI surfaces.
2. Compare viable options and trade-offs.
3. Recommend the simplest design that preserves repo invariants.
4. Define transaction boundaries, permission model, public DTO shape, tests, observability, and rollout.
5. State whether an ADR is required.

### `implement`

1. Build a short plan with files, tests, gates, and subagent assignments.
2. Spawn worker subagents for safe parallel implementation slices when useful.
3. Make or integrate minimal targeted edits.
4. Add/update tests with behavior changes.
5. Run targeted checks, then `pnpm guard` / `pnpm verify` when practical.
6. Run mandatory role-gate review before final response or PR.

### `review`

1. Findings first, ordered by severity.
2. Include file/line references.
3. Focus on bugs, regressions, security, architecture violations, missing tests, and acceptance gaps.
4. If no findings, say so and name residual risk.

### `debug`

1. Capture reproduction, environment, expected vs actual, and known evidence.
2. Rank hypotheses.
3. Inspect logs/tests/code to eliminate hypotheses.
4. Patch root cause, not symptoms.
5. Add a regression test or explicit verification.

### `hotfix`

1. Minimize blast radius.
2. Preserve data and audit evidence.
3. Add the smallest test or guard that proves the fix.
4. Include rollback and follow-up debt.
5. Do not bundle opportunistic cleanup.

### `ship`

1. Confirm ticket/epic linkage.
2. Confirm acceptance evidence.
3. Confirm required checks and manual verification.
4. Confirm mandatory role gates have passed or are explicitly documented as unavailable.
5. Confirm no protected-branch push or hook bypass.
6. Prepare PR/release notes with risks and test plan.

## Active Risk Register

Carry these current facts into planning:

- The security audit is open; do not loosen OAuth, CORS, cookie-auth behavior, logging, or credential handling.
- `.env.local` is treated as compromised; never paste secrets into chat, docs, logs, or commits.
- Deliveries (`E-00C`) unblock online sales and delivery-agent work.
- Frontend overhaul is ongoing; new UI should move toward semantic tokens, shared wrappers, safe display helpers, and consistent resilience states.
- Official documents, email/messaging, supplier procurement, platform events, and stock transfers have dedicated workstream docs.
- Sales document revision lifecycle follows ADR 0020: immutable original documents, credit notes, adjusted replacement invoices, and explicit document chains.

## Claude Boundary

Do not edit or delete:

- `.claude/skills/orchestrate-epic/SKILL.md`
- `.claude/skills/frontend-system/SKILL.md`
- `.claude/skills/refresh-backlog-summary/SKILL.md`
- `docs/process/team-orchestration.md`

Codex may read those files as project context. Codex-specific process changes belong in this file or in a Codex user-scoped skill, not in `.claude/**`.
