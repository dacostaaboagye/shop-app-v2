# Secrets Management

This runbook defines how Shop App handles secrets without binding application
code to one vault provider.

## Architecture

The application has a stable env contract. Providers are interchangeable.

Flow:

1. Secret source stores values by environment and path.
2. A delivery tool injects or exports canonical env names.
3. App code reads `process.env` through the existing env modules.
4. Hosted platforms receive their final runtime copy through platform secret
   stores.

Initial provider: Infisical.

Exit strategy: replace `infisical run` or `infisical export` with another
provider while keeping the same variable names.

## Infisical Layout

Create one Infisical project for this repository.

Environments:

- `dev`
- `testing`
- `staging`
- `production`

Paths:

- `/api` - API runtime secrets.
- `/web` - web build/runtime configuration.
- `/deploy` - CI deployment credentials.
- `/bootstrap` - temporary seed/admin values.

Do not put API provider secrets under `/web`. Browser-exposed `NEXT_PUBLIC_*`
values must never contain secrets.

## Canonical Variables

API `/api`:

- `DATABASE_URL`
- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `AUTH_COOKIE_SECURE`
- `WEB_BASE_URL`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_ALLOWED_FROM_DOMAINS`
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

Web `/web`:

- `API_BASE_URL`
- `R2_ACCOUNT_ID`

Deploy `/deploy`:

- `FLY_API_TOKEN`
- `FLY_APP_NAME`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Bootstrap `/bootstrap`:

- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_FIRST_NAME`
- `SUPER_ADMIN_LAST_NAME`

## Local Setup

Install and authenticate the Infisical CLI using the official Infisical CLI
docs.

Link the local checkout to the Infisical project:

```powershell
infisical login
infisical init
```

Run the API without `.env.local`:

```powershell
infisical run --env=dev --path=/api -- pnpm --filter @shop/api exec tsx watch src/index.ts
```

Run the event worker:

```powershell
infisical run --env=dev --path=/api -- pnpm --filter @shop/api exec tsx watch src/workers/platform-event-delivery-worker.ts
```

Run the web app:

```powershell
infisical run --env=dev --path=/web -- pnpm --filter @shop/web dev
```

Run database migrations with vault-injected values:

```powershell
infisical run --env=dev --path=/api -- pnpm --filter @shop/database db:migrate
```

## CI And Deployment

Current deployment workflows use GitHub environment secrets, then sync API
runtime secrets into Fly and pass web values to Vercel. That remains valid
during migration.

Target workflow:

1. GitHub Actions authenticates to Infisical using a machine identity or the
   official Infisical GitHub integration.
2. The workflow exports `/api` secrets for the target environment and imports
   them into Fly.
3. The workflow exports `/web` values and passes them to Vercel build/runtime
   env.
4. GitHub stores only deployment bootstrap values needed to authenticate to
   Infisical, not the full application secret set.

Example export shape:

```powershell
infisical export --env=testing --path=/api --format=dotenv --output-file=api.secrets
flyctl secrets import --app $env:FLY_APP_NAME < api.secrets
```

Generated `*.secrets` files are ignored and must be deleted after use.

## Rotation Process

Use this process when a secret is exposed or due for routine rotation:

1. Create a replacement secret at the provider, for example Neon, R2, Resend, or
   Google Cloud.
2. Update the value in Infisical for the affected environment/path.
3. Sync hosted runtime stores, for example Fly secrets or Vercel env values.
4. Restart or redeploy affected services.
5. Revoke the old provider credential.
6. Verify the relevant health path or user flow.
7. Record the rotation in the operational log or PR notes without pasting the
   secret value.

## Rules

- Do not commit `.env.local`, `.infisical.json`, exported `.secrets` files, or
  real provider credentials.
- Do not paste secrets into issue comments, PRs, docs, chat, or logs.
- Keep production secrets separate from dev/testing.
- Prefer least-privilege provider keys, for example R2 bucket-scoped tokens.
- Keep app code provider-neutral. No Infisical SDK imports in `apps/*` or
  `packages/*` without a new ADR.
