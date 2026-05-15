# ADR 0022: Vendor-Neutral Secret Delivery

Status: Accepted

Date: 2026-05-07

## Context

The security audit found live service credentials in `.env.local`. The
application needs database, auth-token, R2, Resend, Google OAuth, deployment,
and bootstrap-admin secrets, but keeping plaintext environment files on
developer machines creates avoidable leakage risk.

Infisical is the selected initial vault for local and shared-environment secret
delivery. The project must not become tightly coupled to Infisical because
future cost, trust, compliance, or operational needs may require moving to
another vault or to platform-native secret stores.

## Decision

Shop App keeps a stable environment-variable contract at the application
boundary.

- Application code reads canonical names through existing env modules such as
  `apps/api/src/env.ts` and `apps/web/src/env.ts`.
- Infisical injects those canonical names into the process with `infisical run`
  for local development and `infisical export` for CI/platform sync.
- No application package imports an Infisical SDK.
- No durable generated secret files are committed.
- Provider-specific files such as `.infisical.json` remain local-only unless a
  future ADR decides otherwise.
- Platform runtimes remain the final delivery boundary: Fly receives API
  secrets through `fly secrets`, Vercel receives web build/runtime values
  through Vercel env configuration, and GitHub Actions holds only deployment or
  vault-auth bootstrap credentials.

## Secret Layout

Infisical environments mirror deploy environments:

- `dev`
- `testing`
- `staging`
- `production`

Infisical paths separate blast radius:

- `/api` - API runtime secrets and server-only configuration.
- `/web` - Next.js server/build configuration. No database or provider secrets.
- `/deploy` - deployment credentials such as Fly and Vercel tokens.
- `/bootstrap` - temporary seed/admin setup values.

## Migration Contract

Replacing Infisical must require only delivery-layer changes:

1. Replace `infisical run` commands with the next provider's process-injection
   command.
2. Replace `infisical export` in CI with the next provider's export/sync step.
3. Keep the same canonical variable names.
4. Keep app code and service constructors unchanged.

## Consequences

Positive:

- Live secrets no longer need to sit in `.env.local`.
- Local, CI, and hosted runtime secret delivery can converge on the same
  canonical names.
- Infisical can be removed later without changing backend or frontend code.
- Secret scopes can be audited by environment and path.

Trade-offs:

- Developers need Infisical CLI access before running full local services.
- GitHub Actions still needs a small bootstrap credential or native Infisical
  integration to read deployment secrets.
- Platform-native stores still hold the final runtime copy of deployed secrets.

## Follow-Up

- Rotate credentials that existed in `.env.local`.
- Create Infisical project paths for `dev`, `testing`, `staging`, and
  `production`.
- Move local developer secrets into Infisical and remove plaintext `.env.local`
  use from daily workflows.
- Convert deployment workflows from many GitHub environment secrets to a small
  vault-auth bootstrap once Infisical machine identity is configured.
