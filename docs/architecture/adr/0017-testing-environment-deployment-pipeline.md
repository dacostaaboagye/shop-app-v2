# ADR 0017: Testing Environment Deployment Pipeline

## Status

Accepted

## Context

The repository already has CI verification, Dockerfiles for the API and web
apps, and a split runtime model where platform-event delivery can run in a
dedicated worker process. What it does not have is a trustworthy path for
moving the current `dev` branch into a shared testing environment.

The missing pieces were operational, not architectural:

- CI stopped at `pnpm verify`; it did not deploy anything.
- the API image entrypoint did not match the built output path
- the web image did not accept a build-time API rewrite target
- test-environment seed scripts depended on `.env.local`, which is wrong for CI
  or shared runtime environments
- there was no declared deployment topology for web, API, and worker together

## Decision

The shared testing environment uses one deployment pipeline and three runtime
processes:

1. a web container built with an internal API rewrite target
2. an API container with event delivery disabled
3. a worker container reusing the API image but running the event-delivery
   entrypoint with delivery enabled

The deployment pipeline does the following on `dev` pushes and manual dispatch:

1. verify the repository with `pnpm verify`
2. run database migrations against the testing database
3. seed core reference data
4. seed the test super admin when credentials are configured
5. build and publish the API and web images
6. deploy the compose topology on the testing host

## Consequences

### Positive

- testing deployments now match the split worker architecture already described
  in ADR 0013 and the platform-event backbone guide
- migrations and seeds are explicit parts of deployment, not tribal knowledge
- the web runtime uses same-origin `/api/*` proxying while still talking to the
  API service over the container network
- the deployment path is reproducible and can be promoted to production later

### Tradeoffs

- the testing database must be reachable from GitHub Actions because migrations
  and bootstrap run before image deployment
- the test host must be able to pull private GHCR images
- the web image must be rebuilt when the internal API routing contract changes

## Implementation Notes

- `apps/api/package.json` exposes env-driven seed scripts for CI and shared
  environments, with `:local` variants preserved for local development.
- `apps/api/Dockerfile` now starts `dist/src/index.js` and exposes a real
  healthcheck.
- `apps/web/Dockerfile` accepts `API_BASE_URL` as a build argument and exposes
  a healthcheck backed by `/health`.
- `.github/workflows/deploy-testing.yml` is the source of truth for the testing
  pipeline.
- `deploy/testing/docker-compose.yml` is the source of truth for the deployed
  runtime topology.
