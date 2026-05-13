import {
  adminStockMovementQuerySchema,
  managerStockMovementQuerySchema,
  stockMovementListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { StockMovementQueryRepository } from "./postgres-stock-movement-query.repository.js";

type StockMovementHistoryDeps = {
  permissionService?: Pick<PermissionResolutionService, "assertHasPermission">;
  stockMovementQueryRepo: StockMovementQueryRepository;
};

const adminMovementHistoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.read" },
  method: "GET",
  url: "/api/admin/stock/movements",
};

const managerMovementHistoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.view", scope: "any_active" },
  method: "GET",
  url: "/api/manager/stock/movements",
};

export function registerStockMovementHistoryRoutes(
  server: FastifyInstance,
  deps: StockMovementHistoryDeps = createUnavailableDeps(),
) {
  server.route({
    config: { access: adminMovementHistoryRoute.access },
    method: adminMovementHistoryRoute.method,
    url: adminMovementHistoryRoute.url,
    async handler(request) {
      const query = adminStockMovementQuerySchema.parse(request.query);
      const result =
        await deps.stockMovementQueryRepo.listStockMovements(query);
      return stockMovementListResponseSchema.parse({
        items: result.items,
        locationName: result.locationName ?? undefined,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });

  server.route({
    config: { access: managerMovementHistoryRoute.access },
    method: managerMovementHistoryRoute.method,
    url: managerMovementHistoryRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = managerStockMovementQuerySchema.parse(request.query);
      const location = await deps.stockMovementQueryRepo.findLocationBySlug(
        query.locationSlug,
      );

      if (!location) {
        throw new AppError({
          code: "not_found",
          detail: "The requested stock location could not be found.",
          statusCode: 404,
          title: "Location not found",
        });
      }

      await getPermissionService(deps).assertHasPermission({
        locationId: location.id,
        permission: "stock.view",
        user: actor,
      });

      const result =
        await deps.stockMovementQueryRepo.listStockMovementsForLocation(
          query,
          location,
        );
      return stockMovementListResponseSchema.parse({
        items: result.items,
        locationName: result.locationName ?? undefined,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });
}

function createUnavailableDeps(): StockMovementHistoryDeps {
  return {
    stockMovementQueryRepo: {
      async findLocationBySlug() {
        throw unavailableError();
      },
      async listStockMovements() {
        throw unavailableError();
      },
      async listStockMovementsForLocation() {
        throw unavailableError();
      },
    },
  };
}

function getPermissionService(deps: StockMovementHistoryDeps) {
  if (deps.permissionService) return deps.permissionService;

  throw new AppError({
    code: "internal_error",
    detail: "Stock permission services are not configured.",
    statusCode: 503,
    title: "Stock unavailable",
  });
}

function unavailableError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Stock movement services are not configured.",
    statusCode: 503,
    title: "Stock unavailable",
  });
}
