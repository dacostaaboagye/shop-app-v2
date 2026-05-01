---
id: e-04-03
title: Retry policy + outbox for transient email send failures
status: idea
priority: high
domain: backend
owner: claude
parents: []
acceptance: []
size: medium
---

## Why

Tracked as **E3** in `docs/engineering/uploads-notifications-email-evaluation.md`. Today every send is a single `await transport.send(...)` in `apps/api/src/modules/messaging/email-send-execution.ts`. A Resend 5xx, a transient network drop, or a process restart mid-send loses the email — the caller's `console.error(err)` swallows it. Password reset and email verification are the most user-visible casualties.

We want at-least-once delivery for outgoing email with bounded retries and structured visibility into failures.

## Out of scope

- Switching providers or adding a second provider for failover.
- Per-recipient suppression policy changes (already enforced separately).
- Rate limits at the send layer (covered by `e-04-02` for inbound triggers).

## Open architectural questions for the backend architect

- Inline exponential backoff (3–5 attempts ~5 minutes) vs. durable outbox table that survives restarts. The outbox costs a migration + worker; inline is cheap but loses on restart.
- If outbox: how does it integrate with the existing `email_delivery_attempts` schema and the platform event bus? Does it replace `email-send-execution` or wrap it?
- How are permanent failures (suppression, hard bounce) distinguished from transient ones so we don't retry forever?
