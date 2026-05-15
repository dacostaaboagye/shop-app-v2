import {
  handoverRecipientListQuerySchema,
  handoverRecipientListResponseSchema,
  handoverResponseSchema,
  initiateHandoverRequestSchema,
  ownershipEventResponseSchema,
  revertHandoverRequestSchema,
  workerAssignmentListQuerySchema,
  workerAssignmentListResponseSchema,
  workerHandoverListQuerySchema,
  workerHandoverListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import {
  getAuthenticatedActor,
  getAuthenticatedUserId,
} from "../auth/auth-route-support.js";
import {
  assertActorCanAccessLocation,
  assignmentRoutes,
  type StockAssignmentRouteDependencies,
  toEventResponse,
} from "./stock-assignment-route-support.js";
import {
  getWorkerHandoverLaneCounts,
  toHandoverSummaryResponse,
} from "./stock-assignment-worker-route-mappers.js";

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
      const actor = getAuthenticatedActor(request);
      const userId = getAuthenticatedUserId(request);
      const query = workerAssignmentListQuerySchema.parse(request.query);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: query.locationId,
        permission: "stock.assignments.own.view",
      });
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
  const listRoute = assignmentRoutes.workerHandoverList;
  server.route({
    config: { access: listRoute.access },
    method: listRoute.method,
    url: listRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = workerHandoverListQuerySchema.parse(request.query);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: query.locationId,
        permission: "stock.handovers.manage",
      });
      const handovers =
        await dependencies.handoverQueryRepository.listWorkerHandovers({
          locationId: query.locationId,
          workerId: actor.userId,
        });
      const laneCounts = getWorkerHandoverLaneCounts(
        handovers.map((item) => item.lane),
      );

      return workerHandoverListResponseSchema.parse({
        items: handovers.map(toHandoverSummaryResponse),
        laneCounts,
        locationId: query.locationId,
        locationName: handovers[0]?.locationName ?? "",
      });
    },
  });

  const recipientsRoute = assignmentRoutes.workerHandoverRecipients;
  server.route({
    config: { access: recipientsRoute.access },
    method: recipientsRoute.method,
    url: recipientsRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = handoverRecipientListQuerySchema.parse(request.query);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: query.locationId,
        permission: "stock.handovers.manage",
      });
      const staff =
        await dependencies.assignmentQueryRepository.getLocationStaff(
          query.locationId,
        );
      const recipients = staff.filter(
        (member) =>
          member.roleSlug === "worker" &&
          member.status === "active" &&
          member.userId !== actor.userId,
      );

      return handoverRecipientListResponseSchema.parse({
        items: recipients.map((member) => ({
          activeAssignmentCount: member.activeAssignmentCount,
          firstName: member.firstName,
          lastName: member.lastName,
          primaryImageUrl: member.primaryImageUrl,
          userId: member.userId,
          userSlug: member.userSlug,
        })),
        locationId: query.locationId,
        locationName: staff[0]?.locationName ?? "",
      });
    },
  });

  const initiateRoute = assignmentRoutes.workerInitiateHandover;
  server.route({
    config: { access: initiateRoute.access },
    method: initiateRoute.method,
    url: initiateRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = initiateHandoverRequestSchema.parse(request.body);
      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: body.locationId,
        permission: "stock.handovers.manage",
      });
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
      const handover =
        await dependencies.handoverQueryRepository.getWorkerHandoverChain({
          handoverChainId: body.handoverChainId,
          workerId: actor.userId,
        });

      if (!handover) {
        throw new AppError({
          code: "not_found",
          detail: "No handover chain is available for the current worker.",
          statusCode: 404,
          title: "Handover chain not found",
        });
      }

      await assertActorCanAccessLocation(dependencies.permissionService, {
        actor,
        locationId: handover.locationId,
        permission: "stock.handovers.manage",
      });

      if (!handover.canRevert) {
        throw new AppError({
          code: "forbidden",
          detail:
            "Only the current or original accountable worker can revert this handover.",
          statusCode: 403,
          title: "Handover revert not allowed",
        });
      }

      const originalWorkerId = handover.fromWorkerId;
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
