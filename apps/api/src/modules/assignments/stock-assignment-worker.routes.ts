import {
  handoverResponseSchema,
  initiateHandoverRequestSchema,
  ownershipEventResponseSchema,
  revertHandoverRequestSchema,
  workerAssignmentListQuerySchema,
  workerAssignmentListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import {
  getAuthenticatedActor,
  getAuthenticatedUserId,
} from "../auth/auth-route-support.js";
import {
  assignmentRoutes,
  resolveOriginalWorker,
  type StockAssignmentRouteDependencies,
  toEventResponse,
} from "./stock-assignment-route-support.js";

export function registerWorkerStockAssignmentRoutes(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  registerWorkerListRoute(server, dependencies);
  registerWorkerHandoverRoutes(server, dependencies);
}

function registerWorkerListRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.workerList;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = workerAssignmentListQuerySchema.parse(request.query);
      const assignments =
        await dependencies.assignmentQueryRepository.getWorkerAssignments({
          locationId: query.locationId,
          workerId: userId,
        });
      return workerAssignmentListResponseSchema.parse({
        items: assignments.map((assignment) => ({
          availableQuantity: assignment.availableQuantity,
          brandName: assignment.brandName,
          brandSlug: assignment.brandSlug,
          categoryName: assignment.categoryName,
          categorySlug: assignment.categorySlug,
          effectiveFrom: assignment.effectiveFrom.toISOString(),
          locationId: assignment.locationId,
          onHandQuantity: assignment.onHandQuantity,
          primaryImageUrl: assignment.primaryImageUrl,
          productName: assignment.productName,
          productSlug: assignment.productSlug,
          quantity: assignment.quantity,
          sellingPrice: assignment.sellingPrice,
          sku: assignment.sku,
          skuId: assignment.skuId,
          variantName: assignment.variantName,
          variantSlug: assignment.variantSlug,
          workerId: assignment.workerId,
        })),
        locationId: query.locationId,
        locationName: "",
      });
    },
  });
}

function registerWorkerHandoverRoutes(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const initiateRoute = assignmentRoutes.workerInitiateHandover;
  server.route({
    config: { access: initiateRoute.access },
    method: initiateRoute.method,
    url: initiateRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = initiateHandoverRequestSchema.parse(request.body);
      const result =
        await dependencies.assignmentCommandService.initiateHandover({
          actor,
          fromWorkerId: actor.userId,
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

  const revertRoute = assignmentRoutes.workerRevertHandover;
  server.route({
    config: { access: revertRoute.access },
    method: revertRoute.method,
    url: revertRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = revertHandoverRequestSchema.parse(request.body);
      const originalWorkerId = await resolveOriginalWorker(
        dependencies,
        body.handoverChainId,
      );
      const result = await dependencies.assignmentCommandService.endHandover({
        actor,
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
