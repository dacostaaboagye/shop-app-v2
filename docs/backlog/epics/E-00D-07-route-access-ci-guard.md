---
id: E-00D-07
title: Enforce route access metadata through CI guard
status: done
priority: P1
domain: backend
owner: codex
parents: [E-00D]
acceptance:
  - The route-access guard fails when Fastify route registrations omit required config.access metadata.
  - The guard ignores comments, strings, and non-route helper calls so CI does not pass or fail on false positives.
  - Protected-route authorization fails closed when a matched route has missing or invalid access metadata.
  - The guard is covered by automated tests and runs through the standard verification path.
size: small
---

## Why

Protected routes must declare `config.access` so the API boundary enforces authorization consistently. A route that only hides UI affordances or relies on reviewers to notice missing metadata can ship an authorization gap. This ticket turns the route-access rule into an executable quality gate.

## Scope

1. Strengthen the architecture guard so it analyzes actual Fastify route registrations.
2. Add fixtures proving the guard catches missing access metadata and avoids false positives.
3. Make matched routes with missing or invalid access metadata fail closed at runtime.
4. Wire the guard tests into the root test script so CI exercises them.

## Out of scope

- Changing the access-control permission model.
- Retrofitting unrelated route shapes beyond the current Fastify registration patterns.
- Promoting `dev` to `testing`; testing promotions are batched separately.

## Shipped evidence

- PR #108: https://github.com/dacostaaboagye/shop-app-v2/pull/108
- Merged to `dev` on 2026-05-03.
- Merge commit: `0385a69d3f3de3bb4d4f5e343dba11d4c3548b16`.
- CI `validate`: passed on 2026-05-03 at 13:44 UTC.

Implementation evidence:

- `scripts/architecture/guard-route-access.mjs` validates route-shaped Fastify calls instead of searching for any `access:` string in a file.
- `scripts/architecture/guard-route-access.test.mjs` covers missing access metadata, valid route metadata, comments/strings, and helper-call false positives.
- `apps/api/src/modules/access-control/route-authorization.ts` fails closed for matched routes that lack valid access metadata.
- `apps/api/test/route-authorization.test.ts` covers the fail-closed runtime behavior.

Verification:

- `pnpm guard:routes`
- `node --test scripts/**/*.test.mjs`
- `pnpm --filter @shop/api exec tsx --test test/error-handling.test.ts test/route-authorization.test.ts`
- `pnpm --filter @shop/api typecheck`
- `pnpm guard`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
