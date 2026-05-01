---
id: e-04-02
title: Per-email rate limits on auth endpoints
status: idea
priority: high
domain: backend
owner: claude
parents: []
acceptance: []
size: medium
---

## Why

Tracked as **V1** in `docs/engineering/uploads-notifications-email-evaluation.md`. The auth surface (`/api/auth/forgot-password`, `/api/auth/login`, `/api/auth/email-verification/resend`, the test-send admin endpoint) currently has only IP-based rate limits or none at all. An attacker can enumerate accounts or burn through Resend quota by varying source IPs while hammering a single email address.

We want per-email rate limits with sane defaults, surfaced consistently as `429` responses with `Retry-After` headers and a single `app-error` shape clients already understand.

## Out of scope

- Bot-detection / CAPTCHAs — separate epic if signal warrants.
- Account-lockout policy after N failures — separate epic.
- Rate limits on signed-in admin destructive endpoints (`bulk-invite`, etc.) — covered separately under T2.

## Open architectural questions for the backend architect

- Where does the counter live? Postgres advisory locks vs. Redis vs. in-process LRU. Project hasn't introduced Redis yet; introducing it is a real cost.
- Do we want a single rate-limit utility or extend `@fastify/rate-limit` with a custom `keyGenerator` per route?
- How do we keep the limits test-friendly without leaking state between test files?
