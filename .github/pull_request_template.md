## Ticket

- Backlog item:
- Target branch: `dev` unless this PR is a release or hotfix into `main`

## Definition Of Done Evidence

- Acceptance criteria covered:
- Tests added or updated:
- Docs or ADR updates:
- Local verification run: `pnpm verify`

## Workflow Checks

- [ ] Branch name matches the ticket workflow
- [ ] Commit messages use conventional commits with the branch ticket scope
- [ ] PR targets `dev` unless this is a release or hotfix

## Architecture Checks

- [ ] Protected routes declare access metadata
- [ ] Public contracts expose slugs or references only
- [ ] Business rules are not implemented in route handlers
- [ ] Immutable history remains append-only where required
