---
name: orchestrate-epic
description: Drive an epic through refinement → design → planning → build → test → ux-browser-review (when UI changed) → code review → ship using specialist sub-agents (PO, backend architect, frontend architect, QA, ux-ui-browser-reviewer, code reviewer). Invoke when the user wants the team workflow applied to a backlog item or asks "what's next on the backlog".
---

# Orchestrate an epic

Read [docs/process/team-orchestration.md](../../../docs/process/team-orchestration.md) and [docs/backlog/README.md](../../../docs/backlog/README.md) first if you haven't this session.

## Inputs

The user invokes this skill with one of:

- **An epic id from the xlsx** (`E-00C-01`, `E-02-01`, `E-03-07`) — uppercase, matches the master backlog. If `docs/backlog/epics/<id>-*.md` already exists, jump in at whatever stage that file is at. If it does not exist, the PO materialises it from the xlsx row first (Stage 1).
- **An ops or audit id** (`ops-12`, `audit-h7`). Skip Stage 1 — the orchestrator refines these directly without the PO, since they don't come from the product backlog.
- **No id**. Pick the next priority. The order of preference:
  1. An existing `docs/backlog/epics/*.md` whose `status` is `refined`-or-later and whose `parents` are all `shipped` — work the highest priority among these.
  2. Otherwise, **read the xlsx `Next Up` sheet** at the repo root (`Building and Refining Product Backlog(*).xlsx`), pick the top entry whose status is `Not Started` or `Partial`, and start at Stage 1 to materialise it into an epic file.
- **A description** ("the password reset flash bug", "rebuild media uploader"). Match against existing epic files first, then against xlsx ticket titles. If neither matches and it's clearly product work, ask the user whether to add a row to the xlsx before proceeding.

## Pipeline tier

Spinning up the full team for every epic is overkill. Pick the tier from the epic's id prefix and `size`, and tell the user which tier you picked when you announce the epic in Stage 0. The user can override.

| Tier | When | Stages run |
|---|---|---|
| **Full** | Product epics (`E-*`) with `size: medium` or `large`. Anything where the design space is non-trivial (new schema, new module, multi-system change). | All eight: refine (PO) → design (architect) → plan → build → test (QA) → ux-browser-review (when UI changed) → code review → ship. |
| **Light** | Product epics (`E-*`) with `size: small`. Or a partial epic where the xlsx `Backlog Audit` notes already say what to build (E-03-02 bulk import, E-00D-07 lint guard). | Skip the **PO** when the xlsx row + audit notes are already specific. Run architect → plan → build → QA → ux-browser-review (when UI changed) → code review → ship. |
| **Minimal** | `ops-*` and `audit-*` ids. The audit doc or ops note is the spec. | Skip PO and architect. Run plan → build → code review → ship. Use QA only if the change is non-trivial or hits production paths. Use ux-browser-review only if the chore actually changes UI (rare for ops, common for audit-led UI fixes). |

Override rules:

- The user can ask for a different tier ("just do the minimal pipeline on E-03-02"). Honour it.
- A `size: small` product epic that introduces a new schema or new public API gets bumped back to **full** — the size field doesn't override the architectural reach.
- An `audit-*` id that touches auth, payments, or data integrity gets bumped to **light** — security-adjacent work gets the architect.

When you skip a stage, say so explicitly in your status update so the user can see what wasn't done. The shape of the rule is *"skip this stage because X"*, not *"skipped"*.

## Workflow

Walk these stages in order. Stop and report back to the user at every stage transition — *don't* fan out the whole pipeline silently.

### Stage 0: pick the epic
1. **Existing actionable epics first.** `Glob docs/backlog/epics/*.md` and read frontmatter. An epic is ready if `status` ∈ {refined, designed, planned, built, tested, reviewed} **and** all `parents` ids resolve to `status: shipped`. Among ready epics, prefer the highest `priority` (P0 > P1 > P2 > P3), then the smallest `size`, then alphabetical id.
2. **Otherwise consult the xlsx.** Read `Building and Refining Product Backlog(*).xlsx` at the repo root, sheet `Next Up`. The sheet is already ordered. Pick the top row whose status is `Not Started` or `Partial`. Cross-reference its `Backlog Audit` row for code-state notes.
3. Tell the user which epic you picked, the source (existing file vs xlsx row), and why before proceeding.

### Stage 1: refine (if no epic file exists, or `status: idea`)
This stage materialises an xlsx row into `docs/backlog/epics/<id>-<slug>.md` and refines it.

Spawn the PO agent. Hand it:
1. The xlsx row (id, title, user story, status, priority, notes from `Backlog Audit`).
2. The relevant project context: `CLAUDE.md`, `AGENTS.md`, the relevant ADR if one applies, the most relevant audit doc if the epic is audit-driven.
3. Ask for: refined acceptance criteria, edge cases, out-of-scope items, dependencies on other epics in the xlsx (filled into `parents:`).

```
Agent({
  description: "Refine epic <id>",
  subagent_type: "product-owner-strategist",
  prompt: "Refine xlsx ticket <id> into docs/backlog/epics/<id>-<slug>.md per docs/backlog/README.md. The row data is: ..."
})
```

The PO returns a refined epic. The orchestrator writes the file using the frontmatter contract, sets `status: refined`, and commits on a branch `chore/ops-refine-<id>`.

PO-skip cases (per the tier table):

- **Minimal tier** — `ops-*` / `audit-*` ids. The orchestrator writes the refined file directly using the audit doc or ops note as the spec.
- **Light tier** — `E-*` epics with `size: small` whose xlsx `Backlog Audit` notes are already specific. The orchestrator copies the user story + notes verbatim and writes the file directly. Note in the status update that the PO was skipped because the xlsx row was self-describing.

### Stage 2: design (architects in parallel)
Skipped on the **minimal** tier. On **light** and **full** tiers, decide which architect(s) the epic needs based on `domain`:
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
Branch off `dev` per the [git workflow](../../../docs/engineering/git-workflow.md). Branch name pattern: `feature/<id>-<slug>` or `fix/<id>-<slug>` or `chore/ops-<slug>`. Lowercase only — the validator rejects uppercase ids in branch names.

**Stack depth rule: chains up to depth 3 are fine when every PR in the chain uses rebase merge.** GitHub's "Rebase and merge" button preserves SHAs; `dev` ends up with the original commits in order, so a PR-B branched off PR-A keeps working after PR-A merges — no manual rebase, no SHA divergence. Document the dependency in each PR's body ("Stacked on #N — merge after that lands.") so the human reviewer knows the order. See `docs/engineering/git-workflow.md` for the full merge policy.

Beyond depth 3, the review overhead of tracking the chain outweighs the throughput win — start an independent branch off `dev` instead.

**Independent parallel branches are unrestricted.** Two PRs that branch off `dev` and touch disjoint files can run in parallel without any chain considerations. The depth=3 cap only applies to true chains where one PR depends on another's commits.

**If you reach for squash merge** (the fallback for branches with truly noisy commit history), check that no other open PR is stacked on it first. Squash + stacked = manual rebase needed; that's the failure mode the previous depth=1 rule prevented.

**For light tier**, ship the epic as a single PR — refine + design + plan land as commits on the same feature branch as the build, not as a separate `chore/ops-refine-<id>` PR. Avoids doubling the user's review queue.

**Execute tasks in order.** After each task:
1. Write the tests.
2. Run `pnpm --filter <package> exec biome check --write <touched-paths>` to format-fix before staging.
3. Run **`pnpm verify`** locally — not just `pnpm guard`. The pre-push hook runs it; running it earlier catches the broad-scope issues (cross-package contract test breakage) that scoped local tests miss.
4. `git add` only specific files (avoid `-A`).
5. Commit with the epic id as the conventional-commit scope. For `chore/ops-...` branches the scope is `ops`, not the epic id — the validator enforces this.

**Don't use `--no-verify` to push.** That bypasses `pnpm verify` and ships unverified work to PR. The pre-push hook is the last automatic gate; if it fails, fix the underlying issue.

When all tasks are done and local gates pass, bump `status` to `built`.

### Stage 4 done definition

"Built" requires more than "service interface compiles." Each epic must reach **callable in dev environment by a real role with real data** before being marked done — not just "tests pass with port fakes." That means:

- New permission keys are seeded *and* granted to relevant roles in `apps/api/scripts/lib/access-control-seed.ts`.
- New runtime singletons (event publisher, etc.) are wired in `apps/api/src/index.ts`, not just plumbed through types.
- New ports have at least one real adapter (or a clearly-marked stub *and* a follow-up epic logged for the real adapter).

Surface without integration is debt that compounds — five surface-only epics in a row leave nothing actually reachable in production. If integration cost makes the epic too large, scope cuts are the right call, not deferred wiring.

### Stage 5: test (QA agent)
On the **minimal** tier, skip this stage unless the change touches auth, payments, data integrity, or production-path code — in which case run it. On **light** and **full**, always run it.

Spawn `qa-quality-engineer` with:
1. The refined epic (especially acceptance criteria).
2. The diff: `git diff dev..HEAD`.
3. A request for: regression cases (existing flows the change touches), edge cases, integration scenarios, manual verification steps for a human reviewer.

QA returns a test plan. The orchestrator either:
- Adds the missing automated tests to the same branch, OR
- Records the manual-verification items in a section to paste into the PR description.

Bump `status` to `tested`.

### Stage 5b: ux-ui browser review (conditional)

Run **whenever the change touches the rendered UI**. This is a different lens from QA — it's a real-browser, evidence-based UX / responsive / accessibility / design-system audit, not a test-coverage review.

Trigger when **any** of these is true:

- The epic's `domain` is `frontend` or `full-stack`.
- `git diff dev..HEAD` touches any path under `apps/web/**`.
- A new route, page, modal, drawer, or layout primitive landed.
- Tokens in `apps/web/src/app/globals.css` changed (palette / typography / radii / spacing).
- A design-system primitive in `apps/web/src/components/ui/*` or `apps/web/src/components/system/*` changed in a way that other consumers will inherit.

Skip when:

- Backend / infra / contracts only diff.
- Pure docs changes.
- An ops chore that doesn't render anything (e.g., the neon-serverless driver swap, fly auto-stop config).

When invoked, **run in parallel with Stage 5 QA** — they don't interfere and the review surfaces are disjoint. Send a single message with both `Agent` calls.

Spawn `ux-ui-browser-reviewer` with:

1. The refined epic (especially acceptance criteria touching UX).
2. The list of changed routes / pages / components from the diff.
3. The dev environment URL — confirm it's reachable; surface `localhost:3000` if running locally.
4. Authentication context: which roles to evaluate (admin / manager / worker / supplier / agent), and whether the dev server has a seeded super-admin available. If the agent needs credentials it will ask — provide what you can, redirect to user for anything sensitive.
5. The viewport matrix to test — defaults are fine, but call out **mobile-first 375px is a hard requirement for any worker-portal surface** because workers use the app on phones.
6. A request for the standard structured report — prioritized findings (Critical → Low), responsive-per-breakpoint summary, design-system token violations, accessibility findings, and a final ship/hold/conditional verdict.

The reviewer returns:

- A structured report.
- Concrete fix-ups by severity.
- Evidence (screenshots saved into `.playwright-mcp/` which is gitignored, plus DOM snippets).

The orchestrator either:

- Action every Critical and High finding before opening the PR, OR
- Document the deferred items in the PR description's "Known follow-ups" section with a justification (cap on follow-ups: never defer Critical without explicit user override).

Bump `status` to `tested` only after both Stage 5 QA and Stage 5b browser review have returned (or if 5b was skipped per the rules above).

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
- **Plough through after specialists return.** Don't stop after each stage to ask permission — execute through build/test/review/ship autonomously. Report substantive in-flight updates only. The bar for stopping is in the Workflow section above.
- **One epic per branch. Stack depth = 1.** Wait for the prior epic's PR to merge before starting the next. Squash-merge collapses history; stacked children below it conflict by SHA divergence even when content matches. The auto-update workflow we tried (#72) couldn't fix this — manual rebase to the squashed tip was always required. Cap concurrent open delivery PRs in a chain at one.
- **Don't push with `--no-verify`.** It bypasses `pnpm verify` (the broad gate). Use it only for force-push of an already-verified branch — never to skip a failing pre-push hook. If `pnpm verify` fails, fix the underlying issue.
- **Run `biome check --write` before staging**, not after the commit hook rejects format. Saves a write-fail-rewrite loop on every commit.
- **Run `pnpm verify` locally before pushing**, not just `pnpm guard` + the touched test file. CI runs the full suite, including cross-package contract tests; scoped local tests miss cross-package breakage (real example: a contract grew an enum without the contract test being updated; scoped local test passed, full verify failed in CI).
- **Ask before mutating epic content other than `status` and the additive sections (`## Design`, `## Tasks`, `## Test plan`, `## Related PRs`).** Title, why, acceptance, and out-of-scope are owned by the PO; mutating them silently violates the invariant in `docs/backlog/README.md`.

## Anti-patterns to avoid

- **Spawning the whole pipeline in one shot.** The user reads a 5,000-word return and can't redirect. Slow down: PO first, report; design next, report; etc.
- **Treating the architect output as a binding spec.** It's input to the orchestrator's planning stage, not a contract. The orchestrator may push back, ask follow-ups, or scope the design down.
- **Skipping test stage to ship faster.** The QA pass catches things the architects missed because they're focused on shape, not flow.
- **Letting the reviewer agent rewrite the implementation.** It returns review notes; the orchestrator decides which to action.
