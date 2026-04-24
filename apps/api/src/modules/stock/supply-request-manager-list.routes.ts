import {
  stockSupplyRequestListQuerySchema,
  stockSupplyRequestListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { SupplyRequestAccessPolicy } from "./supply-request-access-policy.js";
import {
  getAuthenticatedActor,
  type StockSupplyRouteDependencies,
  supplyRequestRoutes,
  toRequestResponse,
} from "./supply-request-route-support.js";

export function registerManagerSupplyRequestListRoute(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies,
  accessPolicy: SupplyRequestAccessPolicy,
) {
  const route = supplyRequestRoutes.managerList;
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = stockSupplyRequestListQuerySchema.parse(request.query);
      if (!query.locationId) throw missingLocationIdError();
      await accessPolicy.assertCanListRequestsForLocation({
        actor,
        locationId: query.locationId,
      });
      const result = await dependencies.supplyRequestRepository.listByLocation({
        locationId: query.locationId,
        page: query.page,
        pageSize: query.pageSize,
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

function missingLocationIdError() {
  return new AppError({
    code: "validation_error",
    detail: "locationId is required.",
    statusCode: 400,
    title: "Missing locationId",
  });
}
