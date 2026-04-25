import {
  approveStockSupplyRequestSchema,
  dispatchStockSupplyRequestSchema,
  gtnResponseSchema,
  rejectStockSupplyRequestSchema,
  stockSupplyRequestListQuerySchema,
  stockSupplyRequestListResponseSchema,
  stockSupplyRequestResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { SupplyRequestAccessPolicy } from "./supply-request-access-policy.js";
import { registerManagerSupplyRequestListRoute } from "./supply-request-manager-list.routes.js";
import {
  getAuthenticatedActor,
  type StockSupplyRouteDependencies,
  supplyRequestRoutes,
  toGtnResponse,
  toRequestResponse,
} from "./supply-request-route-support.js";

export function registerManagerSupplyRequestRoutes(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  registerManagerSupplyRequestListRoute(server, dependencies, accessPolicy);
  registerIncomingRoute(server, dependencies, accessPolicy);
  registerApproveRoute(server, dependencies, accessPolicy);
  registerRejectRoute(server, dependencies, accessPolicy);
  registerDispatchRoute(server, dependencies, accessPolicy);
}

function registerIncomingRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.managerIncoming;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = stockSupplyRequestListQuerySchema.parse(request.query);
      const sourceLocationIds = await resolveIncomingSourceLocationIds(
        accessPolicy,
        actor,
        query.sourceLocationId,
      );
      const result =
        await dependencies.supplyRequestRepository.listBySourceLocations({
          page: query.page,
          pageSize: query.pageSize,
          sourceLocationIds,
          ...(query.status ? { status: query.status } : {}),
        });
      return stockSupplyRequestListResponseSchema.parse({
        items: result.items.map(toRequestResponse),
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });
}

async function resolveIncomingSourceLocationIds(
  accessPolicy: SupplyRequestAccessPolicy,
  actor: ReturnType<typeof getAuthenticatedActor>,
  sourceLocationId: string | undefined,
) {
  if (sourceLocationId) {
    await accessPolicy.assertCanListIncomingForSource({
      actor,
      sourceLocationId,
    });
    return [sourceLocationId];
  }

  return accessPolicy.listManageableSourceLocationIds({ actor });
}

function registerApproveRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.managerApprove;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = approveStockSupplyRequestSchema.parse(request.body);
      await loadManageableRequest(
        dependencies,
        accessPolicy,
        actor,
        id,
        "Cannot approve",
      );
      const row = await dependencies.supplyService.approve({
        actor,
        approvedQuantity: body.approvedQuantity,
        id,
        now: new Date(),
        resolutionNotes: body.resolutionNotes ?? null,
        resolvedBy: userId,
      });
      if (!row) throw manageRequestNotFound("Cannot approve");
      return stockSupplyRequestResponseSchema.parse(toRequestResponse(row));
    },
  });
}

function registerRejectRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.managerReject;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = rejectStockSupplyRequestSchema.parse(request.body);
      await loadManageableRequest(
        dependencies,
        accessPolicy,
        actor,
        id,
        "Cannot reject",
      );
      const row = await dependencies.supplyService.reject({
        actor,
        id,
        now: new Date(),
        resolutionNotes: body.resolutionNotes ?? null,
        resolvedBy: userId,
      });
      if (!row) throw manageRequestNotFound("Cannot reject");
      return stockSupplyRequestResponseSchema.parse(toRequestResponse(row));
    },
  });
}

function registerDispatchRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.managerDispatch;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const actor = getAuthenticatedActor(request);
      const { id } = request.params as { id: string };
      const body = dispatchStockSupplyRequestSchema.parse(request.body);
      await loadManageableRequest(
        dependencies,
        accessPolicy,
        actor,
        id,
        "Cannot dispatch",
      );
      const { gtn, supplyRequest } = await dependencies.supplyService.dispatch({
        actor,
        dispatchedBy: userId,
        notes: body.notes ?? null,
        now: new Date(),
        supplyRequestId: id,
      });
      return {
        gtn: gtnResponseSchema.parse(toGtnResponse(gtn)),
        supplyRequest: stockSupplyRequestResponseSchema.parse(
          toRequestResponse(supplyRequest),
        ),
      };
    },
  });
}

async function loadManageableRequest(
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
  actor: ReturnType<typeof getAuthenticatedActor>,
  id: string,
  title: string,
) {
  const existingRequest =
    await dependencies.supplyRequestRepository.findById(id);
  if (!existingRequest) {
    throw manageRequestNotFound(title);
  }
  await accessPolicy.assertCanManageRequest({
    actor,
    supplyRequest: existingRequest,
  });
  return existingRequest;
}

function manageRequestNotFound(title: string) {
  return new AppError({
    code: "not_found",
    detail: requestNotFoundDetail(title),
    statusCode: 404,
    title,
  });
}

function requestNotFoundDetail(title: string) {
  switch (title) {
    case "Cannot approve":
    case "Cannot reject":
      return "Request not found or is not in a pending state.";
    case "Cannot dispatch":
      return "Supply request not found or is not in an approved state.";
    default:
      return "Supply request not found.";
  }
}
