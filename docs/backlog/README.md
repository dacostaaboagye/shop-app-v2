# Backlog

The product backlog has two tiers.

## Tier 1 — master backlog (the xlsx)

The authoritative product backlog lives at the repo root:

```
Building and Refining Product Backlog(<n>).xlsx
```

This is what the Product Owner curates. It contains every epic and user story across all phases (foundation `E-00A..E-00D`, phase-1 `E-01..E-03`, etc.), priorities, status, and the `Next Up` sheet that picks the next batch the team should work on. **Don't** restate the xlsx here in Markdown — the xlsx is the source of truth.

When working with the backlog, read these sheets:

- **`Next Up`** — the ordered queue of what to pull next, with priority and "why this next".
- **`Backlog Audit`** — every ticket with current code-audit status (Done / Partial / Not Started) and notes pointing at the modules that already exist.
- **`Audit Summary`** — top-level health and the critical gaps to close.
- **`Backlog`** — the raw foundation/phase grid the others derive from.
- **`Rewrites & Fixes`** — title rewrites the PO has already applied.

## Tier 2 — actionable epics in this directory

`docs/backlog/epics/<id>-<slug>.md` holds only the epics the PO has **picked from the xlsx and is actively driving** through the [team orchestration workflow](../process/team-orchestration.md). The file is the working surface for that epic — design notes, tasks, test plan, and shipped PRs accumulate here.

Once the PR for an epic merges and the file's `status` flips to `shipped`, the file stays in git as the historical record of what was actually built. The xlsx ticket gets its row updated in the next backlog audit.

### File naming

```
epics/<id>-<slug>.md
```

`<id>` matches the xlsx code: `E-00A-01`, `E-01-02`, `E-03-07`. Use the exact uppercase code from the xlsx so cross-referencing is unambiguous. The slug is short kebab-case (`ownership-ledger`, `password-reset`, `change-log`).

For work that does **not** live in the product backlog xlsx — operational chores, audit-driven security fixes, doc rewrites — use a separate scheme so the namespaces don't collide:

- `ops-<n>` for operational / infrastructure / tooling work.
- `audit-<n>` for findings tracked from a documented audit (`docs/engineering/security-and-auth-audit.md`, `docs/engineering/uploads-notifications-email-evaluation.md`).

These don't go through the PO — the orchestrator can refine them directly.

### Frontmatter contract

```yaml
---
id: E-00C-01
title: Create delivery items from any source in a consistent format
status: idea | refined | designed | planned | built | tested | reviewed | ready-for-human-review | shipped
priority: P0 | P1 | P2 | P3            # mirror the xlsx priority codes
domain: frontend | backend | full-stack | infra | security | docs
owner: claude | <human-handle>
parents: []                            # epic ids this depends on
acceptance:
  - One bullet per acceptance criterion. Filled in by the PO during refinement.
size: small | medium | large
---
```

`status` advances as the workflow progresses. `parents` blocks downstream epics until the parent is shipped — the orchestrator skips epics whose parents are not yet `shipped`.

### Body sections

Filled in over the lifecycle. Roughly in order:

```markdown
## Why
Business motivation. Filled in at idea / refinement time, sourced from the xlsx ticket body.

## Out of scope
What this epic deliberately does not include. Filled in at refinement.

## Design
Architectural notes from the backend / frontend / UI architect agents. Filled in at design stage.

## Tasks
The concrete implementation steps. Filled in at planning stage.

## Test plan
QA's enumeration of regression and edge cases. Filled in at test stage.

## Related PRs
Links to the PRs that delivered this epic. Filled in at ship time.
```

Sections that haven't been reached yet may be omitted.

### Lifecycle invariants

- `status: shipped` epics are immutable. Re-opening creates a *new* epic with `parents: [<old-id>]`.
- `priority` may change at any time. The orchestrator picks the highest-priority non-blocked epic next when invoked without an id.
- `acceptance` may be amended after shipping if scope was discovered post-build, but the change must be a comment in the file noting the amendment date.
- An epic with `status: shipped` and an unset `Related PRs` block is a defect — review caught nothing actually changed.

## How an epic gets started

1. **Pick from the xlsx.** The PO consults `Next Up` and picks the highest-priority ticket whose dependencies are clear.
2. **Materialise as a file.** The PO (or the orchestrator on the PO's behalf) creates `epics/<id>-<slug>.md` with the frontmatter above and copies the user story + acceptance from the xlsx into the `## Why` and `## Out of scope` sections. Initial status is `refined`.
3. **Run the workflow.** From here the orchestrator drives the file through design → plan → build → test → review → ship per `docs/process/team-orchestration.md`.
4. **Close the loop.** When the PR ships, mark the xlsx row `Done` in the next backlog audit and link the PR url under `## Related PRs` in the epic file.

The orchestrator never silently mutates an epic's content during build — it only updates the `status` field and appends to body sections.

## Index

Browse `epics/` directly. Tooling-friendly listings can be generated on demand.
