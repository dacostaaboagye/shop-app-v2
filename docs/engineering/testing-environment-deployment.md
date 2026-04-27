# Testing Environment Deployment

This document is the operator runbook for deploying the shared `testing`
environment.

## Hosting Model

The testing environment runs on the same platform split intended for production:

- `apps/web` on Vercel
- `apps/api` on Fly.io
- the platform-event delivery worker as a Fly.io process group in the same app

The deployment workflow is:

- `.github/workflows/deploy-testing.yml`

It runs on:

- pushes to the `testing` branch
- manual workflow dispatch

## Pipeline

Flow:

1. `pnpm verify`
2. `pnpm deploy:testing:bootstrap`
3. optional `pnpm deploy:testing:seed-admin`
4. sync testing secrets to the Fly app
5. deploy the Fly app with `api` and `worker` process groups
6. scale the Fly app to `api=1` and `worker=1`
7. deploy `apps/web` to the testing Vercel project

## Required GitHub Environment

Create a GitHub environment named `testing`.

### Required secrets

- `TEST_DATABASE_URL`
- `TEST_FLY_API_TOKEN`
- `TEST_FLY_APP_NAME`
- `TEST_VERCEL_TOKEN`
- `TEST_VERCEL_ORG_ID`
- `TEST_VERCEL_PROJECT_ID`
- `TEST_API_BASE_URL`
- `TEST_WEB_BASE_URL`
- `TEST_AUTH_ACCESS_TOKEN_SECRET`
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

### Optional bootstrap-admin secrets

If you want the workflow to keep a deterministic testing admin account seeded:

- `TEST_SUPER_ADMIN_EMAIL`
- `TEST_SUPER_ADMIN_PASSWORD`
- `TEST_SUPER_ADMIN_FIRST_NAME`
- `TEST_SUPER_ADMIN_LAST_NAME`

## Fly.io Setup

Create a Fly app for testing before the first deployment. The workflow deploys
with:

- `apps/api/fly.testing.toml`

The workflow overrides the app name using:

- `TEST_FLY_APP_NAME`

### Get the Fly API token

Use either:

- `fly auth token`

or create a token from your Fly account settings, then store it in:

- `TEST_FLY_API_TOKEN`

### Secrets synced to Fly by the workflow

The workflow writes these to Fly on every testing deployment:

- `DATABASE_URL`
- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `AUTH_COOKIE_SECURE`
- `WEB_BASE_URL`
- `EMAIL_FROM_ADDRESS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

The process-level event-delivery flag is handled by the Fly process commands:

- `api` runs with `PLATFORM_EVENT_DELIVERY_ENABLED=false`
- `worker` runs with `PLATFORM_EVENT_DELIVERY_ENABLED=true`

## Vercel Setup

Create or import a dedicated Vercel project for the testing web environment.
Point that project at:

- `apps/web`

The workflow deploys to that Vercel project using:

- `TEST_VERCEL_TOKEN`
- `TEST_VERCEL_ORG_ID`
- `TEST_VERCEL_PROJECT_ID`

### Get the Vercel values

- `TEST_VERCEL_TOKEN`:
  create a Vercel token in your account settings
- `TEST_VERCEL_ORG_ID`:
  from the Vercel team or account scope
- `TEST_VERCEL_PROJECT_ID`:
  from the project settings for the testing web project

### Web API routing

The web app proxies browser `/api/*` traffic through the same public web
origin. The workflow injects the Fly API public base URL into the Vercel build
as:

- `API_BASE_URL`

Set the public testing API URL in:

- `TEST_API_BASE_URL`

Example:

- `https://shop-app-testing.fly.dev`

This value is used by Next.js rewrites at the web layer. Browser code should
still call relative `/api/*` paths so auth cookies stay first-party at the
public web origin.

## First Deployment Checklist

1. create the Fly testing app
2. create the Vercel testing project for `apps/web`
3. create the GitHub `testing` environment
4. add the required GitHub testing secrets
5. provision the testing database
6. merge into `testing` or trigger `Deploy Testing` manually
7. sign in with the seeded super admin
8. verify:
   - authentication flows
   - email operations page
   - supplier portal invite flow
   - document settings
   - notification delivery health

## Promotion Implication

Testing now uses the intended platform model. Promotion to `stagging` should
reuse the same split with environment-specific app names, project ids, tokens,
and URLs.
