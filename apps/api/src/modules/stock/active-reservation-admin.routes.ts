import {
  activeReservationListQuerySchema,
  activeReservationListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { ActiveReservationQueryService } from "./active-reservation-query.service.js";

type StockRouteDependencies = {
  activeReservationQueryService: Pick<
    ActiveReservationQueryService,
    "listActiveReservations"
  >;
};

const activeReservationListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.read" },
  method: "GET",
  url: "/api/admin/stock/reservations/active",
};

export function registerStockRoutes(
  server: FastifyInstance,
  dependencies: StockRouteDependencies = createUnavailableStockDependencies(),
) {
  server.route({
    config: { access: activeReservationListRoute.access },
    method: activeReservationListRoute.method,
    url: activeReservationListRoute.url,
    async handler(request) {
      const query = activeReservationListQuerySchema.parse(request.query);
      const items =
        await dependencies.activeReservationQueryService.listActiveReservations(
          {
            ...(query.expiresAfter
              ? { expiresAfter: new Date(query.expiresAfter) }
              : {}),
            ...(query.expiresBefore
              ? { expiresBefore: new Date(query.expiresBefore) }
              : {}),
            limit: query.limit,
            locationId: query.locationId,
            ...(query.skuId ? { skuId: query.skuId } : {}),
            ...(query.sourceType ? { sourceType: query.sourceType } : {}),
          },
        );

      return activeReservationListResponseSchema.parse({
        items: items.map((item) => ({
          createdAt: item.createdAt.toISOString(),
          expiresAt: item.expiresAt?.toISOString() ?? null,
          locationId: item.locationId,
          quantity: item.quantity,
          skuId: item.skuId,
          sourceKey: item.sourceKey,
          sourceType: item.sourceType,
          status: item.status,
          updatedAt: item.updatedAt.toISOString(),
        })),
      });
    },
  });
}

function createUnavailableStockDependencies(): StockRouteDependencies {
  return {
    activeReservationQueryService: {
      async listActiveReservations() {
        throw unavailableStockError();
      },
    },
  };
}

function unavailableStockError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Stock services are not configured for this environment.",
    statusCode: 503,
    title: "Stock unavailable",
  });
}
