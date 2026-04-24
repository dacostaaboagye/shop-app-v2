# Testing Environment Deployment

This document is the operator runbook for moving the current `dev` branch into
the shared testing environment.

## Topology

The testing environment runs three services:

- `web`: Next.js standalone server on port `3000`
- `api`: Fastify API on the private compose network
- `worker`: platform-event delivery worker, using the same image as the API

The worker split is required. The platform-event backbone already assumes a
production-style deployment where API nodes append events and worker nodes own
delivery and retries.

## Pipeline

GitHub Actions workflow:

- `.github/workflows/deploy-testing.yml`

Flow:

1. `pnpm verify`
2. `pnpm deploy:testing:bootstrap`
3. optional `pnpm deploy:testing:seed-admin`
4. build and push API and web images to GHCR
5. SSH to the test host and update `deploy/testing/docker-compose.yml`
6. pull and restart the stack

## Required GitHub Environment

Create a GitHub environment named `testing`.

### Required secrets

- `TEST_DATABASE_URL`
- `TEST_DEPLOY_HOST`
- `TEST_DEPLOY_USER`
- `TEST_DEPLOY_SSH_KEY`
- `TEST_DEPLOY_PATH`
- `TEST_GHCR_USERNAME`
- `TEST_GHCR_TOKEN`
- `TEST_AUTH_ACCESS_TOKEN_SECRET`
- `TEST_WEB_BASE_URL`
- `TEST_EMAIL_FROM_ADDRESS`

### Optional secrets

- `TEST_AUTH_COOKIE_SECURE`
- `TEST_GOOGLE_CLIENT_ID`
- `TEST_GOOGLE_CLIENT_SECRET`
- `TEST_GOOGLE_CALLBACK_URL`
- `TEST_RESEND_API_KEY`
- `TEST_RESEND_WEBHOOK_SECRET`
- `TEST_R2_ACCOUNT_ID`
- `TEST_R2_ACCESS_KEY_ID`
- `TEST_R2_SECRET_ACCESS_KEY`
- `TEST_R2_BUCKET`
- `TEST_R2_PUBLIC_URL`
- `TEST_WEB_PORT`

### Optional bootstrap-admin secrets

If you want the workflow to keep a deterministic testing admin account seeded:

- `TEST_SUPER_ADMIN_EMAIL`
- `TEST_SUPER_ADMIN_PASSWORD`
- `TEST_SUPER_ADMIN_FIRST_NAME`
- `TEST_SUPER_ADMIN_LAST_NAME`

## Host Requirements

The target host must have:

- Docker Engine with `docker compose`
- outbound access to `ghcr.io`
- the path from `TEST_DEPLOY_PATH` writable by `TEST_DEPLOY_USER`

The workflow writes a runtime `.env` file into that path and deploys:

- `deploy/testing/docker-compose.yml`

## Runtime Notes

- the API container runs with `PLATFORM_EVENT_DELIVERY_ENABLED=false`
- the worker container runs with `PLATFORM_EVENT_DELIVERY_ENABLED=true`
- the web image is built with `API_BASE_URL=http://api:4000`
- public browser traffic should go to the web service; API requests stay
  same-origin through Next rewrites

## Health Checks

- web: `GET /health`
- api: `GET /health`
- worker health is indirect:
  - container status on the host
  - admin delivery-health endpoint in the app

## First Deployment Checklist

1. provision the testing database
2. set the `testing` environment secrets in GitHub
3. verify the test host can pull private GHCR images
4. push to `dev` or trigger `Deploy Testing` manually
5. sign in with the seeded super admin
6. verify:
   - email operations page
   - document settings
   - supplier portal invite flow
   - notification delivery health

## Promotion Implication

This is intentionally close to the production shape. Promotion later should be
an environment change, not a deployment model rewrite.
