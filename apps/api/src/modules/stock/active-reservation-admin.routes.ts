import {
  adminReservationListResponseSchema,
  adminReservationQuerySchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AdminReservationQueryRepository } from "./postgres-admin-reservation-query.repository.js";

type StockRouteDependencies = {
  reservationQueryRepo: Pick<
    AdminReservationQueryRepository,
    "listReservations"
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
      const query = adminReservationQuerySchema.parse(request.query);
      const result =
        await dependencies.reservationQueryRepo.listReservations(query);
      return adminReservationListResponseSchema.parse({
        items: result.items,
        locationName: result.locationName ?? undefined,
      });
    },
  });
}

function createUnavailableStockDependencies(): StockRouteDependencies {
  return {
    reservationQueryRepo: {
      async listReservations() {
        throw new AppError({
          code: "internal_error",
          detail: "Stock services are not configured for this environment.",
          statusCode: 503,
          title: "Stock unavailable",
        });
      },
    },
  };
}
