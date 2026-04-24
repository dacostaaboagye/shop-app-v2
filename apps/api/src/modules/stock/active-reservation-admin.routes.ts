import {
  adminReservationListResponseSchema,
  adminReservationQuerySchema,
  locationReservationQuerySchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { AdminReservationQueryRepository } from "./postgres-admin-reservation-query.repository.js";

type StockRouteDependencies = {
  permissionService?: Pick<PermissionResolutionService, "assertHasPermission">;
  reservationQueryRepo: Pick<
    AdminReservationQueryRepository,
    "listReservations" | "listReservationsByLocationId"
  >;
};

const activeReservationListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.read" },
  method: "GET",
  url: "/api/admin/stock/reservations/active",
};

const managerActiveReservationListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.view", scope: "any_active" },
  method: "GET",
  url: "/api/manager/stock/reservations/active",
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

  server.route({
    config: { access: managerActiveReservationListRoute.access },
    method: managerActiveReservationListRoute.method,
    url: managerActiveReservationListRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = locationReservationQuerySchema.parse(request.query);
      await getPermissionService(dependencies).assertHasPermission({
        locationId: query.locationId,
        permission: "stock.view",
        user: actor,
      });
      const result =
        await dependencies.reservationQueryRepo.listReservationsByLocationId(
          query,
        );
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
      async listReservationsByLocationId() {
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

function getPermissionService(dependencies: StockRouteDependencies) {
  if (dependencies.permissionService) return dependencies.permissionService;

  throw new AppError({
    code: "internal_error",
    detail:
      "Stock permission services are not configured for this environment.",
    statusCode: 503,
    title: "Stock unavailable",
  });
}
