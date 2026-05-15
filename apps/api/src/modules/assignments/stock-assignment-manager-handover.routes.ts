import {
  handoverResponseSchema,
  initiateHandoverRequestSchema,
  managerHandoverListQuerySchema,
  managerHandoverListResponseSchema,
  ownershipEventResponseSchema,
  revertHandoverRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import {
  assertActorCanAccessLocation,
  assignmentRoutes,
  type StockAssignmentRouteDependencies,
  toEventResponse,
} from "./stock-assignment-route-support.js";
import {
  getManagerHandoverLaneCounts,
  toManagerHandoverSummaryResponse,
} from "./stock-assignment-worker-route-mappers.js";

export function registerManagerHandoverRoutes(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  registerManagerHandoverListRoute(server, dependencies);
  registerManagerInitiateHandoverRoute(server, dependencies);
  registerManagerRevertHandoverRoute(server, dependencies);
}

function registerManagerHandoverListRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.managerHandoverList;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = managerHandoverListQuerySchema.parse(request.query);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: query.locationId,
        permission: "stock.assignments.view",
      });
      const handovers =
        await dependencies.managerHandoverQueryRepository.listLocationHandovers(
          { locationId: query.locationId },
        );

      return managerHandoverListResponseSchema.parse({
        items: handovers.map(toManagerHandoverSummaryResponse),
        laneCounts: getManagerHandoverLaneCounts(
          handovers.map((item) => item.lane),
        ),
        locationId: query.locationId,
        locationName: handovers[0]?.locationName ?? "",
      });
    },
  });
}

function registerManagerInitiateHandoverRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.managerInitiateHandover;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = initiateHandoverRequestSchema.parse(request.body);
      if (!body.fromWorkerId) {
        throw new AppError({
          code: "validation_error",
          detail: "fromWorkerId is required for manager-initiated handovers.",
          statusCode: 400,
          title: "Missing fromWorkerId",
        });
      }
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: body.locationId,
        permission: "stock.assignments.manage",
      });
      const result =
        await dependencies.assignmentCommandService.initiateHandover({
          actor,
          fromWorkerId: body.fromWorkerId,
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
}

function registerManagerRevertHandoverRoute(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies,
) {
  const route = assignmentRoutes.managerRevertHandover;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = revertHandoverRequestSchema.parse(request.body);
      const handover =
        await dependencies.managerHandoverQueryRepository.getManagerHandoverChain(
          { handoverChainId: body.handoverChainId },
        );

      if (!handover) {
        throw new AppError({
          code: "not_found",
          detail: `No handover chain exists for ${body.handoverChainId}.`,
          statusCode: 404,
          title: "Handover chain not found",
        });
      }

      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: handover.locationId,
        permission: "stock.assignments.manage",
      });

      if (!handover.canRevert) {
        throw new AppError({
          code: "conflict",
          detail: "Only active handovers can be reverted.",
          statusCode: 409,
          title: "Handover is not active",
        });
      }

      const result = await dependencies.assignmentCommandService.endHandover({
        actor,
        handoverChainId: body.handoverChainId,
        originalWorkerId: handover.fromWorkerId,
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
