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
2. `pre-push` runs `pnpm verify`.
3. Shared root config changes invalidate Turbo caches through `globalDependencies` in `turbo.json`.

If you change shared files such as `tsconfig.base.json`, `biome.json`, `pnpm-lock.yaml`, or root `package.json`, Turbo will now rerun affected tasks instead of replaying stale local results.

## Pull Requests

Open PRs into `dev` unless you are cutting a release or hotfix into `main`.

Before opening a PR:

1. Rebase or merge from the latest `dev`.
2. Run `pnpm verify`.
3. Fill in the PR template with backlog evidence and architecture checks.

Recommended merge policy:

1. Use squash merge from feature branches into `dev`.
2. Promote `dev` to `main` through a dedicated release PR.
3. Keep `main` protected and release-oriented.

## CI

GitHub Actions runs `pnpm verify` for every PR and for pushes to `dev` and `main`.

Concurrency cancellation is enabled so superseded CI runs do not waste time.
