# Git Workflow

This repository uses a ticket-first workflow with `dev` as the integration branch and `main` as the release branch.

## Branching

Create feature branches from `dev`.

- Feature work: `feature/e-00b-02-available-stock-query`
- Fix work: `fix/e-00b-02-stock-query-null-scope`
- Operational work: `chore/ops-ci-cache-hardening`

Allowed long-lived branches are `dev`, `develop`, `main`, and `master`.

## Commits

Use conventional commits.

- Ticket branches must use the branch ticket as the commit scope.
- Ops branches must use `ops` as the scope.

Examples:

- `feat(e-00b-02): add available stock query`
- `fix(e-00b-02): remove unused catalog runtime code`
- `chore(ops): harden turbo cache invalidation`

The `commit-msg` hook enforces this format locally.

## Local Gates

Before code leaves your machine:

1. `pre-commit` runs `pnpm enforce:branch-name`, `pnpm guard`, and `pnpm lint`.
2. `pre-push` runs `pnpm validate:affected` — guards + lint + typecheck + tests
   for packages changed relative to `origin/dev` (`TURBO_SCM_BASE`). Full
   `pnpm verify` (all tests + build) stays in CI; it made local pushes take
   10+ minutes and GitHub closed the idle SSH connection before the ref
   transfer began, since git connects before the hook runs.
3. Shared root config changes invalidate Turbo caches through `globalDependencies` in `turbo.json`.

If you change shared files such as `tsconfig.base.json`, `biome.json`, `pnpm-lock.yaml`, or root `package.json`, Turbo will now rerun affected tasks instead of replaying stale local results.

## Pull Requests

Open PRs into `dev` unless you are cutting a release or hotfix into `main`.

Before opening a PR:

1. Rebase or merge from the latest `dev`.
2. Run `pnpm verify`.
3. Fill in the PR template with backlog evidence and architecture checks.

### Merge strategy: rebase merge into `dev`

Use **rebase merge** (GitHub's "Rebase and merge" button) for every PR into `dev`. Squash merge collapses the PR's commits into one new SHA on `dev`, which breaks any stacked PR that branched off the merged one — every commit below the squash needs manual rebase to a content-equivalent SHA. Rebase merge preserves the original SHAs, so a PR-B branched off PR-A keeps working after PR-A merges. No more stack-depth=1 cap from this constraint.

For this to read cleanly on `dev`, every commit on a feature branch must already be a coherent unit:

- Conventional Commits format with the epic id as scope (`feat(e-04-08): ...`, `fix(e-04-05): ...`, `chore(ops): ...`). The `commit-msg` hook enforces this.
- One logical change per commit — no `wip`, no `fixup`, no `oh sorry` commits.
- Each commit passes `pnpm verify` independently if possible. If a build is in flight across two commits (rare), make the split obvious in the messages.
- Rebase your branch onto the latest `dev` before opening the PR (the `pre-push` hook + `pnpm verify` already encourage this).

If a feature branch has accumulated noise (a long iteration, multiple WIP commits), `git rebase -i origin/dev` to squash + reword before opening the PR. Don't ship branch noise to `dev`.

#### Stacked PR rules

With rebase merge, chains up to **depth 3** (`PR-A → PR-B → PR-C`) are acceptable provided:

1. Every PR in the chain uses rebase merge — not squash, not merge-commit.
2. The PR description explicitly notes the chain: "Stacked on #N — merge after that lands."
3. Reviewers know which subset of files is the actual delta vs the inherited base.

Beyond depth 3, the cognitive overhead of tracking the stack outweighs the throughput win — split into independent branches off `dev` instead.

#### Squash merge fallback

Squash merge stays available for one specific case: a feature branch with truly noisy commit history that the author hasn't cleaned up. If you reach for squash, ensure no other open PR is stacked on the branch — if there is, ask the author to clean up and use rebase, or coordinate the rebase yourself before merging.

#### Promotion to `main`

Promote `dev` to `main` through a dedicated release PR. Use **merge commit** there (not rebase) so the release boundary is visible in the history as a single point. `main` stays protected and release-oriented.

## CI

GitHub Actions runs `pnpm verify` for every PR and for pushes to `dev` and `main`.

Concurrency cancellation is enabled so superseded CI runs do not waste time.
