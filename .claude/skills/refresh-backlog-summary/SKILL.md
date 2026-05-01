---
name: refresh-backlog-summary
description: Re-derive docs/backlog/scope-summary.md from the master xlsx so the snapshot doesn't go stale. Invoke when the user asks to refresh, re-derive, update, or audit the backlog summary, or after a known PO update to the xlsx.
---

# Refresh backlog summary

Re-reads the master product-backlog xlsx at the repo root and updates `docs/backlog/scope-summary.md` to match. Stops short of pushing — opens a PR for human review.

## Inputs

The user invokes this skill with:

- **No arguments.** Find the master xlsx (`Building and Refining Product Backlog(*).xlsx` at repo root). If multiple match, ask which one to use. If none match, stop and tell the user.

## Workflow

1. **Read the xlsx.** Use `openpyxl` via the Bash tool. The high-signal sheets are:
   - `Audit Summary` — top-line counts and critical gaps.
   - `Backlog Audit` — per-ticket status, priority, notes (this drives tier A in the summary).
   - `Next Up` — the ordered queue.
   - `EPIC1..EPIC16` — future-scope epic stubs (drives tier B).
   - `Rewrites & Fixes` — PO title rewrites worth flagging.

   Set `PYTHONIOENCODING=utf-8` and `sys.stdout.reconfigure(encoding='utf-8')` — the xlsx contains Unicode arrows and em-dashes that crash on the default Windows code page.

2. **Compare against `docs/backlog/scope-summary.md`** on the current branch. The current file has a `Last derived` date stamp at the top. Specifically check:
   - Has the count breakdown shifted (Done / Partial / Not Started)?
   - Has any tier-A ticket changed status?
   - Have unfinished-ticket gap notes changed?
   - Has any `EPICn` sheet been authored — especially **E-04**, which is currently undefined?
   - Has the `Next Up` order changed?
   - Have any of the flagged authoring issues been fixed (EPIC4 duplicate of EPIC3, EPIC11 duplicate body, EPIC13 dual headers)?

3. **Decide the change scope.**
   - Nothing material changed → bump the `Last derived` date. PR title: `chore(ops): refresh scope-summary date stamp (no scope changes)`.
   - Something changed → rewrite the affected sections, bump the date, list the deltas in a `## Changes since <prior-date>` section appended to the PR body. PR title: `chore(ops): refresh scope-summary from latest backlog audit`.

4. **Branch + commit + PR.**
   - Branch from `dev` as `chore/ops-scope-summary-<yyyy-mm-dd>` using today's date.
   - Run `pnpm guard` before committing — doc-only edits should pass clean.
   - Conventional commit: `chore(ops): refresh scope-summary ...`.
   - Open PR into `dev`. Link the master xlsx filename and the prior `Last derived` date in the body.
   - **Never push directly to `dev` / `testing` / `staging` / `main`.** PRs only.

5. **Report back to the user** with a one-line summary: the prior date, the new date, and a count of what shifted (e.g. "3 tickets advanced from Partial to Done; E-04 still undefined").

## Hard rules

- The xlsx is authoritative. If the doc and xlsx disagree, the doc is wrong — never edit the xlsx from this skill.
- Don't invent gap notes for partial tickets. If the `Backlog Audit` notes column hasn't changed, copy it through verbatim.
- Don't restate the xlsx in full — this is a synthesis, not a transcription. Keep the "When to read this vs the xlsx" guidance intact.
- If the xlsx file path or filename has changed, update `docs/backlog/README.md` and `docs/backlog/scope-summary.md` to match in the same PR.
