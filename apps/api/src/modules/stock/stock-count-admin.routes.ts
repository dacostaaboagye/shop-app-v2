import { adminStockCountRequestSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { AdminStockCountRepository } from "./postgres-admin-stock-count.repository.js";

type StockCountDeps = {
  permissionService?: Pick<PermissionResolutionService, "assertHasPermission">;
  stockCountRepo: Pick<
    AdminStockCountRepository,
    "findCountLocationBySlug" | "setOnHandQuantity"
  >;
};

const stockCountRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "POST",
  url: "/api/admin/stock/balances/count",
};

const managerStockCountRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.write",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/manager/stock/balances/count",
};

export function registerStockCountRoutes(
  server: FastifyInstance,
  deps: StockCountDeps = createUnavailableDeps(),
) {
  server.route({
    config: { access: stockCountRoute.access },
    method: stockCountRoute.method,
    url: stockCountRoute.url,
    async handler(request) {
      const body = adminStockCountRequestSchema.parse(request.body);
      const actor = getAuthenticatedActor(request);
      return deps.stockCountRepo.setOnHandQuantity({
        ...body,
        countedBy: actor.userId,
        countedBySlug: actor.userSlug,
      });
    },
  });

  server.route({
    config: { access: managerStockCountRoute.access },
    method: managerStockCountRoute.method,
    url: managerStockCountRoute.url,
    async handler(request) {
      const body = adminStockCountRequestSchema.parse(request.body);
      const actor = getAuthenticatedActor(request);
      const location = await deps.stockCountRepo.findCountLocationBySlug(
        body.locationSlug,
      );

      if (!location) {
        throw new AppError({
          code: "not_found",
          detail: `Location "${body.locationSlug}" was not found.`,
          statusCode: 404,
          title: "Location not found",
        });
      }

      await getPermissionService(deps).assertHasPermission({
        locationId: location.id,
        permission: "inventory.write",
        user: actor,
      });

      return deps.stockCountRepo.setOnHandQuantity({
        ...body,
        countedBy: actor.userId,
        countedBySlug: actor.userSlug,
      });
    },
  });
}

function createUnavailableDeps(): StockCountDeps {
  return {
    stockCountRepo: {
      async findCountLocationBySlug() {
        throw unavailableStockCountError();
      },
      async setOnHandQuantity() {
        throw unavailableStockCountError();
      },
    },
  };
}

function getPermissionService(deps: StockCountDeps) {
  if (deps.permissionService) return deps.permissionService;

  throw new AppError({
    code: "internal_error",
    detail: "Stock count permission services are not configured.",
    statusCode: 503,
    title: "Stock unavailable",
  });
}

function unavailableStockCountError() {
  return new AppError({
    code: "internal_error",
    detail: "Stock count services are not configured.",
    statusCode: 503,
    title: "Stock unavailable",
  });
}
