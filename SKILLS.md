# Repo Skills

This repository uses local agent skills to keep implementation patterns
consistent.

## Available repo skills

Skills live in `.claude/skills/<name>/SKILL.md` so Claude Code discovers them
automatically and they can be invoked directly.

- `.claude/skills/frontend-system/SKILL.md` — apply the frontend conventions
  for `apps/web`: route + page composition, React Query, TanStack Form/Table,
  Zustand, the design-token rules, and mobile-first behaviour for the worker
  portal. Auto-invoked on any `apps/web/**` change.
- `.claude/skills/orchestrate-epic/SKILL.md` — drive a backlog epic through
  refine → design → plan → build → test → review → ship using specialist
  sub-agents. Invoked as `/orchestrate-epic <id>` or with no id to pick the
  next priority from the xlsx `Next Up` sheet.
- `.claude/skills/refresh-backlog-summary/SKILL.md` — re-derive
  `docs/backlog/scope-summary.md` from the master xlsx so the snapshot
  doesn't go stale. Invoked as `/refresh-backlog-summary` or by asking
  Claude to "refresh the backlog summary".

## Related repo guidance

- `AGENTS.md`
- `docs/frontend/design-system.md`
- `docs/frontend/agent-rules.md`
- `docs/engineering/typescript-javascript-rules.md`

The workbook-derived scope and execution order are summarized in
`docs/product/project-scope.md`.
