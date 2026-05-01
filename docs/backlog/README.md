# Backlog

Epic-level work items that flow through the [team orchestration workflow](../process/team-orchestration.md). Each epic lives as a single Markdown file in `epics/` so the lifecycle, design notes, tasks, and shipped PRs all stay co-located and reviewable in git.

## File naming

```
epics/<id>-<slug>.md
```

`<id>` matches the workbook scheme: `e-XX-YY` for delivery work, `ops-XX` for operational/infrastructure work, `audit-XX` for findings tracked from a security or system audit. The slug is kebab-case and short (`worker-mobile-dashboard`, `per-email-rate-limits`).

## Frontmatter contract

Every epic file starts with this frontmatter:

```yaml
---
id: e-04-01
title: Worker mobile dashboard rebuild
status: idea | refined | designed | planned | built | tested | reviewed | ready-for-human-review | shipped
priority: critical | high | medium | low
domain: frontend | backend | full-stack | infra | security | docs
owner: claude | <human-handle>
parents: []                # ids of epics this depends on
acceptance:
  - One bullet per acceptance criterion. Filled in by PO during refinement.
size: small | medium | large
---
```

`status` advances as the workflow progresses. `parents` blocks downstream epics until the parent is shipped — the orchestrator skips epics whose parents are not yet `shipped`.

## Body sections

Filled in over the lifecycle. Roughly in order:

```markdown
## Why
Business motivation. Filled in at idea time.

## Out of scope
What this epic deliberately does not include. Filled in at refinement.

## Design
Architectural notes from the backend / frontend / UI architect agents.
Filled in at design stage.

## Tasks
The concrete implementation steps. Filled in at planning stage.

## Test plan
QA's enumeration of regression and edge cases. Filled in at test stage.

## Related PRs
Links to the PRs that delivered this epic. Filled in at ship time.
```

Sections that haven't been reached yet may be omitted.

## Lifecycle invariants

- `status: shipped` epics are immutable. Re-opening creates a *new* epic with `parents: [<old-id>]`.
- `priority` may change at any time. The orchestrator picks the highest-priority non-blocked epic next when invoked without an id.
- `acceptance` may be amended after shipping if scope was discovered post-build, but the change must be a comment in the file noting the amendment date.
- An epic with `status: shipped` and an unset `Related PRs` block is a defect — review caught nothing actually changed.

## How epics get added

- Anyone can drop a `status: idea` epic in `epics/`. Minimum viable: title, why, owner.
- The PO agent refines it on first orchestration.
- The orchestrator never silently mutates an epic's content during build — it only updates the `status` field and appends to body sections.

## Index

Tooling-friendly listing is generated on demand. For now, browse `epics/` directly.
