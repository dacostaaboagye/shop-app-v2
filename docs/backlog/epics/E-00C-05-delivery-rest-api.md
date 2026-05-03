---
id: E-00C-05
title: Expose REST API for delivery creation, assignment, status, and queries
status: blocked
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

> Current status note: Codex DoD audit on 2026-05-03 found the HTTP edge mostly implemented and added missing route/fallback evidence, but E-00C-05 is not DoD-ready until delivery REST DTOs stop exposing internal UUID/user identifiers or the product/architecture backlog explicitly approves a public delivery identifier strategy.

## Codex DoD audit - 2026-05-03

Outcome: **No ship**.

Evidence added during audit:

- Dispatch, complete, and cancel route tests now prove origin-scoped permission checks happen before status service invocation.
- Delivery route params now use Zod UUID parsing before query/status services run.
- Default unwired delivery runtime now has structured 503 route tests for representative creation, status, detail, and list endpoints.

Remaining blocker:

- Delivery responses and route contracts still expose UUID fields such as `deliveryId`, `deliveryItemId`, `skuId`, `originLocationId`, `assignedUserId`, and `createdBy`. ADR 0002 requires public APIs to use slugs, codes, or references instead of raw internal IDs. Delivery persistence currently has item-level `itemReference` but no delivery-level public reference, so this needs an explicit identifier design before the ticket can be marked complete.

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
