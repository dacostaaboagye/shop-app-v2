# ADR 0018: Testing Deployment on Vercel and Fly.io

## Status

Accepted

## Context

The repository has a split runtime model:

- `apps/web` is a Next.js application
- `apps/api` is a long-running Fastify API
- platform-event delivery runs as a background worker process

The prior testing deployment design used one SSH-managed host running Docker
Compose. That approach introduced unnecessary operational surface area for a
stack that already maps cleanly to managed platforms:

- Vercel is the natural fit for the Next.js web application
- Fly.io is the natural fit for the API and background worker runtime

The team also promotes code through branch environments:

1. feature -> `dev`
2. `dev` -> `testing`
3. `testing` -> `stagging`

The testing deployment pipeline must therefore trigger from the `testing`
branch, not from `dev`.

## Decision

The shared testing environment uses:

1. Vercel for `apps/web`
2. one Fly.io app for `apps/api`
3. two Fly process groups inside that app:
   - `api`
   - `worker`

The workflow does the following on `testing` pushes and manual dispatch:

1. verify the repository with `pnpm verify`
2. run database migrations against the testing database
3. seed core reference data
4. seed the test super admin when credentials are configured
5. sync testing runtime secrets to Fly.io
6. deploy the API and worker processes to Fly.io
7. deploy the web app to the testing Vercel project

## Consequences

### Positive

- the web app uses the hosting platform best aligned with Next.js
- the API and worker use a platform suited to long-running processes
- testing deployment now matches the real target hosting model
- branch promotion semantics remain clean: merge to `testing`, deploy testing

### Tradeoffs

- the testing environment now depends on two external platforms instead of one
- operators must manage Vercel project identifiers and Fly app configuration
- runtime configuration is split between GitHub testing secrets, Fly secrets,
  and Vercel deployment configuration

## Implementation Notes

- `.github/workflows/deploy-testing.yml` is the source of truth for the
  testing deployment pipeline
- `apps/api/fly.testing.toml` defines the API and worker process topology on
  Fly.io
- `docs/engineering/testing-environment-deployment.md` is the operator runbook
  for creating the required GitHub, Vercel, and Fly configuration
