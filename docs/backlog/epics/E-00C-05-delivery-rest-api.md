---
id: E-00C-05
title: Expose REST API for delivery creation, assignment, status, and queries
status: done
priority: P0
domain: backend
owner: claude
parents: [E-00C-04]
acceptance:
  - 10 REST endpoints under /api/deliveries covering creation (3 source variants), status transitions (5), and reads (2).
  - Every route has config.access enforced via the route-authorization middleware (ADR 0004).
  - Per-source and per-transition permission keys registered in the access-control seed catalogue.
  - Validation: zod request schemas + response schema parsing on every route.
  - 503 fallback when delivery services are not wired into the runtime (matches stock module pattern).
size: medium
---

> Current status note: E-00C-05 is DoD-complete after PR #107 resolved the public delivery identifier blocker raised by the Codex audit. Delivery REST routes now use delivery references, location/user slugs, and SKU public identifiers at the API boundary instead of exposing internal UUIDs.

## Codex DoD audit - 2026-05-03

Outcome: **Initially no ship; closed after E-00C-06 shipped**.

Evidence added during audit:

- Dispatch, complete, and cancel route tests now prove origin-scoped permission checks happen before status service invocation.
- Delivery route params now use Zod UUID parsing before query/status services run.
- Default unwired delivery runtime now has structured 503 route tests for representative creation, status, detail, and list endpoints.

Resolved blocker:

- PR #107 added delivery header references, updated public route params and DTOs to use references/slugs/SKU codes, and added regression coverage that public delivery responses and errors do not serialize internal delivery, item, SKU, location, user, or creator UUIDs.

## Why

The deliveries module shipped a service surface in E-00C-01..04 but had no HTTP edge. Other modules (manager portal, agent portal in E-15, future customer flows) need REST endpoints to drive delivery creation, assignment, dispatch, completion, cancellation, and reads.

## Out of scope

- Frontend portal screens that call these endpoints.
- Slug-based location resolution (`/locations/:slug/deliveries/...`) — endpoints take location ids in the request body or query for now. Slug routing can be added in a follow-up if frontend ergonomics require it.
- The `deliveries.create_from_online_order` path — registered with the per-source permission but the upstream stub still returns null, so the route surfaces 404 until E-14 wires real data.

## Endpoints

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/deliveries/from-sale` | `deliveries.create_from_sale` (any_active) | Body: invoice reference + destination snapshot |
| POST | `/api/deliveries/from-online-order` | `deliveries.create_from_online_order` | Body: order reference + destination snapshot |
| POST | `/api/deliveries/from-transfer` | `deliveries.create_from_transfer` (any_active) | Body: transfer reference |
| POST | `/api/deliveries/:deliveryId/assign` | `deliveries.assign` | Body: assignedUserId |
| POST | `/api/deliveries/:deliveryId/reassign` | `deliveries.reassign` | Body: assignedUserId |
| POST | `/api/deliveries/:deliveryId/dispatch` | `deliveries.dispatch` | No body |
| POST | `/api/deliveries/:deliveryId/complete` | `deliveries.complete` | No body |
| POST | `/api/deliveries/:deliveryId/cancel` | `deliveries.cancel` | Body: reason (1-240 chars) |
| GET  | `/api/deliveries/:deliveryId` | `deliveries.view` | Returns the full record |
| GET  | `/api/deliveries` | `deliveries.view` (any_active) | Query: locationId XOR agentUserId, optional status[], optional limit |

## Tasks (one commit)

1. Permission seed entries (8 new keys) in `apps/api/scripts/lib/access-control-seed.ts`.
2. `delivery-route-access.ts` — RouteDefinition objects per endpoint.
3. `delivery-response.mapper.ts` — record-to-response converters.
4. `delivery-creation.routes.ts`, `delivery-status.routes.ts`, `delivery-query.routes.ts` (split for the 250-LOC budget).
5. `register-deliveries-routes.ts` — top-level register function with 503 fallback for unwired runtimes.
6. Wire `registerDeliveriesRoutes` into `create-server.ts`.

## Shipped evidence

- PR #106 hardened the delivery REST edge and route/fallback evidence.
- PR #107 resolved the public identifier blocker and merged to `dev` on 2026-05-03.
- PR #107 merge commit: `d13198612987a61b58912e64f8257e7e506f337b`.
- CI `validate` for PR #107 passed on 2026-05-03 at 13:08 UTC.
- E-00C-05 acceptance now has evidence through the combined route, authorization, fallback, DTO-shape, and public-identifier tests shipped across PR #106 and PR #107.
