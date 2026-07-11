# Production Rollback Runbook

One page. Read top to bottom during an incident; don't improvise order.

## First: classify the failure

| Symptom | Layer | Go to |
|---|---|---|
| Web UI broken, API healthy (`/health` 200 on Fly host) | Vercel | Web rollback |
| API errors / 5xx / crash loops | Fly | API rollback |
| Data wrong or migration failed | Database | Database section |
| Secrets leaked or suspicious auth activity | Credentials | Credential incident |

## Web rollback (Vercel)

Instant, zero build:

1. Vercel dashboard → project → Deployments → previous production deployment → **Promote to Production**. CLI alternative: `vercel rollback --token <token>`.
2. No state involved; safe to do first while diagnosing.

## API rollback (Fly)

```bash
flyctl releases --app shop-app-production            # find last good version
flyctl releases rollback <version> --app shop-app-production
flyctl status --app shop-app-production              # confirm api + worker healthy
```

Rollback redeploys the previous image; Fly secrets are not reverted. If the bad
release changed secrets, re-import the previous values first (`flyctl secrets
import`), because secret changes trigger their own release.

## Database

Stance: **roll forward, not back.** Drizzle migrations here are not written to
be reversible, and ledger tables are append-only by design.

- Migration failed mid-deploy: the deploy stops before the new API ships
  (migrate job precedes deploy in `deploy-production.yml`). Fix the migration,
  push again. Old code + old schema keep running.
- New code + new schema is live and wrong: prefer a compensating fix-forward
  PR. Rolling back API code to a version that predates the schema is only safe
  if the migration was additive (new tables/columns) — check before reverting.
- Data corruption: Neon point-in-time restore → restore into a **branch**,
  verify, then decide cutover. Never restore over the live branch blind.

## Credential incident

1. Rotate the affected credential at the provider (Neon / R2 / Google /
   Resend / Fly / Vercel).
2. Update the GitHub `production` environment secret.
3. Re-run `Deploy Production` (workflow dispatch) to sync secrets to Fly.
4. `POST /api/auth/logout-all` exists per user; for a platform-wide token
   compromise rotate `AUTH_ACCESS_TOKEN_SECRET` — this invalidates every
   access token at once. Refresh tokens are hashed at rest and rotate on use.

## After any rollback

- Note what/when/why in the incident log (start one in `docs/engineering/` if
  none exists).
- Open a ticket for the root cause; a rollback is a mitigation, not a fix.
- If the bad release reached `main`, revert the commit on `main` so the next
  push doesn't redeploy the same defect.
