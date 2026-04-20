import {
  assignVariantRequestSchema,
  batchAssignVariantRequestSchema,
  batchAssignVariantResponseSchema,
  handoverResponseSchema,
  initiateHandoverRequestSchema,
  locationAssignmentListQuerySchema,
  locationAssignmentListResponseSchema,
  ownershipEventResponseSchema,
  reassignVariantRequestSchema,
  revertHandoverRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import {
  assignmentRoutes,
  resolveOriginalWorker,
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
      const userId = getAuthenticatedUserId(request);
      const body = assignVariantRequestSchema.parse(request.body);
      const result =
        await dependencies.ownershipEventWriteService.assignProduct({
          assignedBy: userId,
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
      const userId = getAuthenticatedUserId(request);
      const body = batchAssignVariantRequestSchema.parse(request.body);
      await assertBatchStockAvailable(dependencies, body);
      for (const item of body.items) {
        await dependencies.ownershipEventWriteService.assignProduct({
          assignedBy: userId,
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
      const userId = getAuthenticatedUserId(request);
      const body = reassignVariantRequestSchema.parse(request.body);
      const result =
        await dependencies.ownershipEventWriteService.reassignProduct({
          locationId: body.locationId,
          newWorkerId: body.toWorkerId,
          reassignedBy: userId,
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
      const query = locationAssignmentListQuerySchema.parse(request.query);
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

function registerManagerHandoverRoutes(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const initiateRoute = assignmentRoutes.managerInitiateHandover;
  server.route({
    config: { access: initiateRoute.access },
    method: initiateRoute.method,
    url: initiateRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = initiateHandoverRequestSchema.parse(request.body);
      if (!body.fromWorkerId) {
        throw new AppError({
          code: "validation_error",
          detail: "fromWorkerId is required for manager-initiated handovers.",
          statusCode: 400,
          title: "Missing fromWorkerId",
        });
      }
      const result =
        await dependencies.ownershipHandoverService.initiateHandover({
          fromWorkerId: body.fromWorkerId,
          initiatedBy: userId,
          locationId: body.locationId,
          skuId: body.skuId,
          toWorkerId: body.toWorkerId,
        });
      return handoverResponseSchema.parse({
        handoverChainId: result.handoverChainId,
        handoverInEvent: toEventResponse(result.handoverInEvent),
        handoverOutEvent: toEventResponse(result.handoverOutEvent),
      });
    },
  });

  const revertRoute = assignmentRoutes.managerRevertHandover;
  server.route({
    config: { access: revertRoute.access },
    method: revertRoute.method,
    url: revertRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = revertHandoverRequestSchema.parse(request.body);
      const originalWorkerId = await resolveOriginalWorker(
        dependencies,
        body.handoverChainId,
      );
      const result = await dependencies.ownershipHandoverService.endHandover({
        endedBy: userId,
        handoverChainId: body.handoverChainId,
        originalWorkerId,
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
