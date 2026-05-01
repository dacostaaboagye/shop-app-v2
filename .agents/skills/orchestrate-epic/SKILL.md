---
name: orchestrate-epic
description: Drive an epic through refinement → design → planning → build → test → review → ship using specialist sub-agents (PO, backend architect, frontend architect, QA, code reviewer). Invoke when the user wants the team workflow applied to a backlog item or asks "what's next on the backlog".
---

# Orchestrate an epic

Read [docs/process/team-orchestration.md](../../../docs/process/team-orchestration.md) and [docs/backlog/README.md](../../../docs/backlog/README.md) first if you haven't this session.

## Inputs

The user invokes this skill with one of:

- **An epic id** (`e-04-01`, `ops-12`, `audit-h7`). Skip to *Pick the epic* using that id.
- **No id**. Pick the highest-priority `status: refined`-or-later, non-blocked epic from `docs/backlog/epics/`. If everything is `idea`, ask the user which to refine first.
- **A description** ("the password reset flash bug", "rebuild media uploader"). Match against existing epic titles; if no match, propose creating a new one.

## Workflow

Walk these stages in order. Stop and report back to the user at every stage transition — *don't* fan out the whole pipeline silently.

### Stage 0: pick the epic
- `Glob docs/backlog/epics/*.md` to enumerate candidates.
- Read frontmatter for status and parents.
- An epic is ready if `status` ∈ {refined, designed, planned, built, tested, reviewed} **and** all `parents` ids resolve to `status: shipped`.
- Among ready epics, prefer the highest `priority`, then the smallest `size`, then alphabetical id.
- Tell the user which epic you picked and why before proceeding.

### Stage 1: refine (if status is `idea`)
Spawn the PO agent. Hand it:
1. The epic file content.
2. The relevant project context: `CLAUDE.md`, `AGENTS.md`, the relevant ADR if one applies, the most relevant audit doc if the epic is audit-driven.
3. Ask for: refined acceptance criteria, edge cases, out-of-scope items, dependencies on other epics.

```
Agent({
  description: "Refine epic <id>",
  subagent_type: "product-owner-strategist",
  prompt: "Refine the epic at docs/backlog/epics/<id>-<slug>.md ..."
})
```

The PO returns a refined version. Update the epic file: bump `status` to `refined`, add the criteria + out-of-scope + parents fields. Commit on a branch `chore/ops-refine-<id>`.

### Stage 2: design (architects in parallel)
Decide which architect(s) the epic needs based on `domain`:
- `backend` / `infra` → only `node-backend-systems-architect`.
- `frontend` → only `frontend-ui-architect`.
- `full-stack` → both, in parallel.
- `security` → backend architect by default; ask the user if they want a security-specific review.
- `docs` → no design stage; skip to planning.

For full-stack, send both prompts in **a single message with two Agent calls** so they run in parallel.

Each architect's prompt should include:
1. The refined epic.
2. The relevant repo conventions (`AGENTS.md` plus `docs/frontend/agent-rules.md` for frontend or the relevant ADR for backend).
3. Existing related modules they should align with (be specific — name files).

Append the agent outputs to a `## Design` section in the epic, attributed to the agent that wrote each note. Bump `status` to `designed`.

### Stage 3: plan (orchestrator)
You (the orchestrator) own this stage. Read the design notes and decompose into tasks. Each task should:
- Name files to touch.
- Name tests to write.
- Be small enough to commit independently if needed.

Use TaskCreate to track them in the session. Append a `## Tasks` section to the epic. Bump `status` to `planned`.

### Stage 4: build (orchestrator)
Branch off `dev` per the [git workflow](../../../docs/engineering/git-workflow.md). Branch name pattern: `feature/<id>-<slug>` or `fix/<id>-<slug>` or `chore/ops-<slug>`.

Execute tasks in order. After each task: write the tests, run `pnpm guard` + the affected test files, commit with the epic id as the conventional-commit scope. Don't push yet.

When all tasks are done and local gates pass, bump `status` to `built`.

### Stage 5: test (QA agent)
Spawn `qa-quality-engineer` with:
1. The refined epic (especially acceptance criteria).
2. The diff: `git diff dev..HEAD`.
3. A request for: regression cases (existing flows the change touches), edge cases, integration scenarios, manual verification steps for a human reviewer.

QA returns a test plan. The orchestrator either:
- Adds the missing automated tests to the same branch, OR
- Records the manual-verification items in a section to paste into the PR description.

Bump `status` to `tested`.

### Stage 6: review (code reviewer agent)
Spawn `code-review-gatekeeper` with:
1. The diff vs `dev`.
2. The acceptance criteria.
3. Repo conventions: `AGENTS.md`, `CLAUDE.md`, the relevant rule docs.

Address every concrete fix-up the reviewer returns. If it returns architectural pushback, escalate to the user — don't act unilaterally on architecture changes during review.

Bump `status` to `reviewed`.

### Stage 7: ship (orchestrator)
Push the branch with `--no-verify` only if pre-push hooks have already been satisfied locally — they should be, since you've been running `pnpm guard` per task.

Open the PR into `dev` with:
- Title: `<type>(<id>): <one-line summary>` per conventional commits.
- Body: linked to the epic file, lists acceptance criteria and which were proven, includes QA's manual test plan.
- Test plan checklist for the human reviewer.

Bump `status` to `ready-for-human-review`. The user merges; the orchestrator does not push to `dev` directly.

When the user confirms the PR has merged, bump `status` to `shipped`, list the PR url under `## Related PRs`, and commit that change on a chore branch.

## Hard rules

- **Never push directly to `dev`, `testing`, `staging`, `main`, or `master`.** PRs only.
- **Never spawn a specialist agent to write code.** They return analysis or design; you write the diff. This keeps the merge boundary clean.
- **Stop and report at stage transitions.** The user may want to redirect, change scope, or block on an external decision.
- **One epic per branch.** If during build you discover a second epic worth of work, file a new epic, link it as a parent of the original, and ship the smaller scope.
- **Ask before mutating epic content other than `status` and the additive sections (`## Design`, `## Tasks`, `## Test plan`, `## Related PRs`).** Title, why, acceptance, and out-of-scope are owned by the PO; mutating them silently violates the invariant in `docs/backlog/README.md`.

## Anti-patterns to avoid

- **Spawning the whole pipeline in one shot.** The user reads a 5,000-word return and can't redirect. Slow down: PO first, report; design next, report; etc.
- **Treating the architect output as a binding spec.** It's input to the orchestrator's planning stage, not a contract. The orchestrator may push back, ask follow-ups, or scope the design down.
- **Skipping test stage to ship faster.** The QA pass catches things the architects missed because they're focused on shape, not flow.
- **Letting the reviewer agent rewrite the implementation.** It returns review notes; the orchestrator decides which to action.
