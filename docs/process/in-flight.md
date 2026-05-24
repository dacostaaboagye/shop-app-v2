# In-flight branches

Single source of truth for which feature/fix/chore branches are currently being driven through the orchestrate-epic pipeline. Read this on Stage 0; update on Stage 4 entry and on Stage 7 exit.

## Why this file exists

Multiple orchestrator sessions can run in parallel — one human running two Claude Code windows on different machines, or two collaborators each driving an epic. They don't see each other's working state. Without a shared register, both can branch off `dev`, both can pick the same epic from the xlsx `Next Up`, both can commit work that conflicts at push time. The register is a 60-second read that prevents the collision.

## How to use

**On Stage 0** (pick the epic): read this file. If the epic you're about to pick already has an active row, escalate to the user — don't start a parallel branch on the same epic. If the epic has no row, you're clear to proceed.

**On Stage 4 entry** (build): add a row when you cut the branch.

**On Stage 7 exit** (ship): remove the row when the PR is opened (orchestrator has nothing more to do until the user merges). Optional: keep the row with `stage: ready-for-human-review` until the merge lands, so a second orchestrator knows not to start a chained PR before the predecessor is in.

**Stale entries** (> 48h with no commit on the branch and no orchestrator activity): the next orchestrator that reads the file flags them as orphans. The user decides whether to resume, archive, or delete the branch.

## Format

A single Markdown table. One row per active branch. Empty when nothing is in flight.

```
| Branch | Epic | Stage | Orchestrator | Updated |
|---|---|---|---|---|
| feature/e-05-01-... | E-05-01 | built | claude (window-A) | 2026-05-09 |
| chore/ops-rebase-... | ops-rebase | review | claude (window-B) | 2026-05-09 |
```

Field meanings:

- **Branch** — the local branch name. Lowercase, matches `scripts/git/validate-branch-name.mjs`.
- **Epic** — the epic id (`E-04-08-D`) or the ops/audit slug (`ops-rebase`, `audit-h7`). Mirrors what `<id>` you used in the branch name.
- **Stage** — current orchestrate-epic stage: `discovery` / `refined` / `designed` / `planned` / `built` / `tested` / `reviewed` / `ready-for-human-review`. Mirrors the `status:` on the epic file when there is one.
- **Orchestrator** — who is driving. For a single-user solo session: just `claude`. For multi-window or multi-collaborator: append a stable disambiguator (`claude (window-A)` or `claude (alice)`).
- **Updated** — ISO date (YYYY-MM-DD) of the last meaningful change. Doesn't have to be precise to the minute — daily granularity is enough to spot stale entries.

## Branches NOT to register

- The orchestrator's own session-housekeeping branches (status-flip commits, scope-summary refreshes, doc updates) that get committed and pushed within the same minute.
- Branches that aren't yet pushed and may not become PRs (experimental local-only branches).

If unsure, register it. The cost of an extra row is zero; the cost of a missed collision is real.

## Active branches

| Branch | Epic | Stage | Orchestrator | Updated |
|---|---|---|---|---|
