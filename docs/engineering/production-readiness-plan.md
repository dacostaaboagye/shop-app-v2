# Production Readiness Plan

Target: **internal operations pilot** — admin, manager, and worker portals covering
stock, deliveries, invoicing, and CRM. POS (E-07) and the e-commerce ladder
(E-13..E-16) are out of scope for this launch; they are not built yet.

> Drafted: 2026-07-11. Statuses below were verified against code and git history
> on that date. Owner ticks boxes as items close; keep this doc honest or delete it.

## Phase 0 — Security closeout (blockers)

- [ ] **C2 — rotate leaked credentials.** Rotate all four sets that sat in
  `.env.local`: Neon `DATABASE_URL`, Cloudflare R2 access key + secret, Google
  OAuth client secret, Resend API key. `.env.local` itself is already deleted
  from disk; rotation is the outstanding half. **Requires operator action in
  each provider dashboard — cannot be done from this repo.**
- [ ] **C2 — purge local log files.** `dev-*.log`, `tmp-api-*.log`,
  `.codex-verify.log` in the repo root are gitignored but still on disk and may
  contain request payloads from before log redaction shipped. Audit, then delete.
- [x] Verify audit findings against current code (done 2026-07-11 — see
  `security-and-auth-audit.md` status lines; C3, H1, H2, H4–H7, M1, M2, M5,
  M7–M9, M11 confirmed closed).
- [x] Refresh `security-and-auth-audit.md` so statuses match reality.
- [ ] **M3 residual** — add smoke test asserting refresh cookie ships
  `SameSite=Strict` + `HttpOnly`, so a regression fails CI.
- [ ] **M6** — set explicit Fastify `bodyLimit` in `create-server.ts`.
- [ ] Fresh security review of the newest surfaces (invoices E-09, CRM E-12,
  customer portal access) — newest code, least audited.
- [ ] Update `CLAUDE.md` security guardrails section — several entries reference
  findings that are now closed.

## Phase 1 — Production infrastructure

Deploy workflows already exist (`deploy-production.yml`, `deploy-staging.yml`,
`fly.production.toml`, `fly.staging.toml`). Work is provisioning + verification,
not build.

- [ ] Provision production Neon project (separate from testing).
- [ ] Create Fly production app (api + worker process groups per
  `fly.production.toml`).
- [ ] Create Vercel production project pointed at `apps/web`.
- [ ] Production R2 bucket; CORS pinned to the production `WEB_BASE_URL`
  (PUT/GET/HEAD, `content-type`, expose `ETag`).
- [ ] GitHub `production` environment + secret set (mirror the testing list in
  `testing-environment-deployment.md`), or Infisical machine identity per
  `secrets-management.md`.
- [ ] Domain + DNS + TLS. Set `WEB_BASE_URL`, `AUTH_COOKIE_SECURE=true`,
  production Google OAuth callback URL.
- [ ] Dry-run the full pipeline through **staging** first: migrate, seed,
  deploy, scale, smoke-test sign-in.
- [ ] Seed production super admin from env-sourced password; confirm forced
  password change on first login.

## Phase 2 — Operational readiness

- [ ] Error tracking (Sentry or similar) wired into API + web. Currently no
  visibility into production exceptions.
- [ ] Fly health checks wired to alerting; external uptime check on web + api.
- [ ] Backup verification: confirm Neon PITR window, then perform one actual
  restore-to-branch drill. An untested backup does not count.
- [ ] Decide log shipping/retention beyond Fly's default buffer.
- [ ] Rollback runbook (one page, `docs/engineering/`): `fly releases revert`,
  Vercel instant rollback, migration-rollback stance, escalation contact.
- [ ] Load sanity pass on the heaviest list/report endpoints at expected pilot
  volume. Rate limits exist (600/min global + per-route); latency is unverified.

## Phase 3 — Pilot readiness (product/UX)

- [ ] Role-based UAT on staging: super admin, admin, manager, worker. Cover
  auth flows, stock counts, assignment/handover, deliveries, invoice issuance +
  manual approval, CRM customer links, customer portal access links.
- [ ] Worker portal exercised on a real phone (low-end Android), not just
  devtools emulation — mobile-first is a hard constraint.
- [ ] Reproducible data bootstrap: real locations, catalog via bulk import
  (E-03-02), opening stock via E-04 flows, real users + role grants. Script it.
- [ ] One-page onboarding notes for workers and managers.

## Phase 4 — Launch + hardening

- [ ] Promote per git workflow: `dev` → `testing` → staging soak → `main`.
- [ ] Limited pilot (one location, small worker group) for ~1 week; check error
  tracker + logs daily; widen after a clean week.
- [ ] Post-launch backlog: MFA for admin accounts (L7), session inventory UX
  (M10 residual), remaining L findings, then resume epics — E-07 POS is next by
  dependency graph.

## Exit criteria for "ready"

1. C2 fully closed (rotation confirmed + logs purged).
2. Staging deploy green end-to-end, UAT passed for all four roles.
3. Error tracking + uptime alerting live; one successful restore drill.
4. Rollback runbook written and understood by the operator.
