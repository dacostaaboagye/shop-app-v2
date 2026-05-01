---
id: e-04-05
title: Notification API backend filtering + read-time preference + cursor pagination
status: idea
priority: medium
domain: full-stack
owner: claude
parents: []
acceptance: []
size: medium
---

## Why

Tracked as **N2** + **N3** in `docs/engineering/uploads-notifications-email-evaluation.md`.

- **N2**: `apps/api/src/modules/notifications/postgres-notification-query.repository.ts` returns up to 50 items with no `eventType`, `locationId`, `dateRange`, or `search` params. The frontend (`notification-center-page-client.tsx`) filters in JS over what it already received. Power users with 1000+ notifications can't see older items.
- **N3**: `postgres-notification-recipient.repository.ts:filterActiveUserIds` checks `notificationInAppEnabled = true` at projection time. Disabling in-app doesn't hide existing notifications; new ones never get created. Preference changes don't take effect retroactively.

We want backend filtering with cursor-based pagination over `(status, occurredAt, notificationKey)`, and we want the in-app preference checked at read time so the user can hide noisy events without losing the audit trail.

## Out of scope

- Server-Sent Events delivery rework (already polled via fallback).
- Filter UI redesign — pair with the design pilot if needed.
- Per-event-type preferences (currently a single in-app toggle).

## Open architectural questions

- Cursor encoding format and how it survives schema additions.
- Backwards compatibility: existing clients call without query params and expect 50 items max — keep that as the default page size?
- Does the read-time filter slow the unread-count query enough to need a denormalised counter?
