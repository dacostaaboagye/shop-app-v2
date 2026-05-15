import {
  assignVariantRequestSchema,
  batchAssignVariantRequestSchema,
  batchAssignVariantResponseSchema,
  locationAssignmentListQuerySchema,
  locationAssignmentListResponseSchema,
  ownershipEventResponseSchema,
  reassignVariantRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import { registerManagerHandoverRoutes } from "./stock-assignment-manager-handover.routes.js";
import {
  assertActorCanAccessLocation,
  assignmentRoutes,
  type StockAssignmentRouteDependencies,
  toEventResponse,
} from "./stock-assignment-route-support.js";
import { assertBatchStockAvailable } from "./stock-assignment-stock-validation.js";

export function registerManagerStockAssignmentRoutes(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  registerAssignRoute(server, dependencies);
  registerBatchAssignRoute(server, dependencies);
  registerReassignRoute(server, dependencies);
  registerListRoute(server, dependencies);
  registerManagerHandoverRoutes(server, dependencies);
}

function registerAssignRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.managerAssign;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = assignVariantRequestSchema.parse(request.body);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: body.locationId,
        permission: "stock.assignments.manage",
      });
      const result = await dependencies.assignmentCommandService.assignProduct({
        actor,
        locationId: body.locationId,
        ...(body.effectiveFrom ? { now: new Date(body.effectiveFrom) } : {}),
        quantity: body.quantity,
        skuId: body.skuId,
        workerId: body.workerId,
      });
      return {
        event: ownershipEventResponseSchema.parse(
          toEventResponse(result.event),
        ),
        status: result.status,
      };
    },
  });
}

function registerBatchAssignRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.managerBatchAssign;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = batchAssignVariantRequestSchema.parse(request.body);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: body.locationId,
        permission: "stock.assignments.manage",
      });
      await assertBatchStockAvailable(dependencies, body);
      for (const item of body.items) {
        await dependencies.assignmentCommandService.assignProduct({
          actor,
          locationId: body.locationId,
          quantity: item.quantity,
          skuId: item.skuId,
          workerId: body.workerId,
        });
      }
      return batchAssignVariantResponseSchema.parse({
        assignedCount: body.items.length,
        locationId: body.locationId,
        workerId: body.workerId,
      });
    },
  });
}

function registerReassignRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.managerReassign;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = reassignVariantRequestSchema.parse(request.body);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: body.locationId,
        permission: "stock.assignments.manage",
      });
      const result =
        await dependencies.assignmentCommandService.reassignProduct({
          actor,
          locationId: body.locationId,
          newWorkerId: body.toWorkerId,
          skuId: body.skuId,
        });
      return {
        event: ownershipEventResponseSchema.parse(
          toEventResponse(result.event),
        ),
        status: result.status,
      };
    },
  });
}

function registerListRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.managerList;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = locationAssignmentListQuerySchema.parse(request.query);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: query.locationId,
        permission: "stock.assignments.view",
      });
      const assignments =
        await dependencies.assignmentQueryRepository.getLocationAssignments(
          query.locationId,
        );
      return locationAssignmentListResponseSchema.parse({
        items: assignments.map((assignment) => ({
          effectiveFrom: assignment.effectiveFrom.toISOString(),
          eventType: assignment.eventType,
          productName: assignment.productName,
          quantity: assignment.quantity,
          sku: assignment.sku,
          skuId: assignment.skuId,
          variantName: assignment.variantName,
          workerEmail: assignment.workerEmail,
          workerId: assignment.workerId,
          workerName: assignment.workerName,
        })),
        locationId: query.locationId,
        locationName: "",
      });
    },
  });
}
