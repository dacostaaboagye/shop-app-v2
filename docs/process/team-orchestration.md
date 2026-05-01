# Team orchestration

How a single Claude Code session ships epics by spawning specialist sub-agents for the parts each is best at, and acts as the integrating contributor for everything else.

## The team

| Role | Sub-agent | Responsibility |
|------|-----------|----------------|
| Product Owner | `product-owner-strategist` | Refines an epic into user stories, acceptance criteria, definition of done. Reconciles stakeholder asks, defines UAT scenarios. |
| Backend architect | `node-backend-systems-architect` | Designs API surface, data model, transactions, event flows. Reviews changes that touch services, repositories, or schema. |
| Frontend architect | `frontend-ui-architect` | Designs UI composition, component breakdown, state ownership, accessibility, responsive behaviour, design-token decisions. |
| QA | `qa-quality-engineer` | Writes the test strategy, edge-case enumeration, regression cases. Runs the release-readiness check before merge. |
| Code reviewer | `code-review-gatekeeper` | Reviews implementation against acceptance criteria + repo conventions before the PR is ready for human review. |
| Integrating contributor | Claude (this session) | Coordinates the others, writes the actual code and tests, opens PRs, runs `pnpm verify`, manages the backlog file. |

The integrating contributor is the only role that *holds the keyboard*. Specialist agents return analysis, designs, plans, or test plans — they don't directly edit the working tree. This keeps the merge boundary clean and the diff reviewable by a human.

## Workflow per epic

```
┌──────────┐   ┌────────┐   ┌─────────┐   ┌──────┐   ┌────────┐   ┌──────┐   ┌─────┐
│ refined  │──▶│design ▼│──▶│ planned │──▶│built │──▶│tested ▼│──▶│review│──▶│ship │
└──────────┘   └────────┘   └─────────┘   └──────┘   └────────┘   └──────┘   └─────┘
      ▲              backend + frontend                           gatekeeper
      │              + UI designer in parallel                    last gate
      │
   PO refinement
```

Detail per stage:

### 1. Refine (PO agent)
Input: a row from the master backlog xlsx at the repo root (`Building and Refining Product Backlog(*).xlsx`, `Next Up` sheet) — or an existing `docs/backlog/epics/<id>-<slug>.md` with `status: idea`.
The orchestrator hands the row + project context (CLAUDE.md, AGENTS.md, relevant ADRs, audit notes from the `Backlog Audit` sheet) to `product-owner-strategist`.
Output: a `docs/backlog/epics/<id>-<slug>.md` file that did not exist before (or a rewrite of the existing one) with `status: refined`, user stories, acceptance criteria, edge cases, UAT scenarios, and dependencies on other xlsx tickets. The PO also flags scope ambiguity.

### 2. Design (architect agents in parallel)
Input: the refined epic.
The orchestrator decides which architect(s) the epic needs:
- API or schema change? `node-backend-systems-architect`
- UI surface or component change? `frontend-ui-architect`
- Both? Run them in parallel.
Output: design notes appended to the epic under a `## Design` section. Backend notes cover endpoints, data model, transactions, events. Frontend notes cover composition, state owner, accessibility, responsive behaviour, token additions/changes.
Status flips to `designed`.

### 3. Plan (orchestrator with `buddy:plan` / `buddy:tasks`)
Input: the designed epic.
The orchestrator decomposes the design into discrete implementation tasks. Tasks reference: files to touch, services to extend, contracts to add, tests to write.
Output: a `## Tasks` section in the epic, or a sibling `tasks.md` for large epics. Status flips to `planned`.

### 4. Build (orchestrator)
Input: the planned epic.
The orchestrator branches off `dev` per the [git workflow](../engineering/git-workflow.md), executes tasks one at a time, writes tests with each behaviour change, runs `pnpm guard` and the affected test files locally before committing. Each task gets its own commit on the same branch.
Status flips to `built` when all tasks are done and local gates pass.

### 5. Test (QA agent)
Input: the built branch.
The orchestrator hands the diff and acceptance criteria to `qa-quality-engineer`. QA enumerates regression cases, edge cases, integration scenarios, manual test plan. The orchestrator turns the QA output into either: more automated tests on the same branch, or a list of manual checks pasted into the PR description.
Status flips to `tested`.

### 6. Review (code-review-gatekeeper agent)
Input: the diff vs `dev` and the acceptance criteria.
`code-review-gatekeeper` checks against repo conventions: route-access decorators, public-id rules, file-length limits, design-system rules, append-only ledger rules, error contract. Returns concrete fix-up items if any.
The orchestrator addresses fix-ups on the same branch.
Status flips to `reviewed`.

### 7. Ship (orchestrator)
Input: the reviewed branch.
The orchestrator pushes the branch, opens a PR into `dev` with a description that links the epic file, lists acceptance criteria, and includes the QA test plan. Status flips to `ready-for-human-review` until the human merges; then `shipped`.

## Decision rights

Some calls are agent-owned, some are orchestrator-owned, some are user-owned.

| Decision | Owner |
|----------|-------|
| Acceptance criteria for a refined epic | PO agent |
| API contract shape | Backend architect |
| Component decomposition | Frontend architect |
| Test coverage threshold for a story | QA agent |
| Scope cuts during build | Orchestrator (escalate to user if blocking) |
| Architecture-level deviations from ADRs | User (orchestrator drafts, asks for sign-off) |
| Storage technology choices (Redis vs DB vs in-process) | User (PO + architects propose; user picks) |
| Pushing to `testing`, `staging`, `main` | User (orchestrator never pushes to a protected branch) |
| Opening a PR | Orchestrator (no approval needed; PR is reversible) |

## Working agreement carry-overs

These remain in force from `AGENTS.md` and `CLAUDE.md`:

- Branch names match the regex in `scripts/git/validate-branch-name.mjs`.
- Conventional commits with the epic id as scope: `feat(e-04-02): ...`, `fix(e-04-05): ...`. Use `chore(ops): ...` for non-epic work.
- One epic = one PR if it fits under the file-length and review-bandwidth limits. Otherwise split per the planning stage.
- `pnpm guard` and `pnpm --filter <pkg> typecheck` + `lint` must pass locally before push.
- Public APIs expose slugs / reference numbers, never raw DB ids.
- Append-only ledgers stay append-only.

## How to invoke

The orchestration is invoked manually for now via the `orchestrate-epic` skill (see `.agents/skills/orchestrate-epic/SKILL.md`).

```
/skill orchestrate-epic e-04-01
```

The skill reads the named epic, walks the workflow stages, and prompts the user at decision points.
