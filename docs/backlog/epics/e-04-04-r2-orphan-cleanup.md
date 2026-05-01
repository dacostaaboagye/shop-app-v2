---
id: e-04-04
title: Cleanup policy for unconfirmed R2 uploads
status: idea
priority: medium
domain: backend
owner: claude
parents: []
acceptance: []
size: small
---

## Why

Tracked as **U1** in `docs/engineering/uploads-notifications-email-evaluation.md`. The presigned-PUT flow gives a client a URL to upload to R2 directly. Today, if the client never calls `confirm()` (closed tab, network drop, abort), the R2 object stays. There is no DB record of the presign, no R2 lifecycle policy in code, and no orphan sweep — storage grows unbounded.

This is small but it has been sitting; let's decide and ship.

## Out of scope

- The `MediaUploader` UX rebuild — separate epic.
- Magic-byte verification at confirm — already shipped (PR #61).

## Decision the user needs to make first

Three reasonable directions, each with different cost:

1. **R2 lifecycle policy** — cheapest. Configure the bucket to expire unconfirmed objects after 24h. No app code change. We just document it in `docs/engineering/storage-and-files.md`.
2. **`presign_records` table + cleanup job** — most observable. We get audit history of presigns, can reconcile with `media` rows, alert on orphan rates. Costs: a migration + a scheduled job + tests.
3. **Document and accept** — cheapest in code, weakest operationally. Acceptable only if R2 volume stays low.

PO + backend architect should propose; user picks before plan stage starts.
