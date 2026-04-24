import {
  adminStockBalanceListResponseSchema,
  locationStockBalanceQuerySchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { StockBalanceQueryRepository } from "./postgres-stock-balance-query.repository.js";

type StockBalanceLocationDeps = {
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">;
  stockBalanceQueryRepo: Pick<
    StockBalanceQueryRepository,
    "listStockBalancesByLocationId"
  >;
};

const workerStockBalanceRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "worker.stock.view",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/worker/stock/balances",
};

const managerStockBalanceRoute: RouteDefinition = {
  access: { kind: "permission", permission: "stock.view", scope: "any_active" },
  method: "GET",
  url: "/api/manager/stock/balances",
};

export function registerStockBalanceLocationRoutes(
  server: FastifyInstance,
  deps: StockBalanceLocationDeps = createUnavailableDeps(),
) {
  server.route({
    config: { access: workerStockBalanceRoute.access },
    method: workerStockBalanceRoute.method,
    url: workerStockBalanceRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = locationStockBalanceQuerySchema.parse(request.query);
      await assertLocationPermission(deps, {
        actor,
        locationId: query.locationId,
        permission: "worker.stock.view",
      });
      const result =
        await deps.stockBalanceQueryRepo.listStockBalancesByLocationId(query);
      return adminStockBalanceListResponseSchema.parse({
        items: result.items,
        locationName: result.locationName ?? undefined,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });

  server.route({
    config: { access: managerStockBalanceRoute.access },
    method: managerStockBalanceRoute.method,
    url: managerStockBalanceRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = locationStockBalanceQuerySchema.parse(request.query);
      await assertLocationPermission(deps, {
        actor,
        locationId: query.locationId,
        permission: "stock.view",
      });
      const result =
        await deps.stockBalanceQueryRepo.listStockBalancesByLocationId(query);
      return adminStockBalanceListResponseSchema.parse({
        items: result.items,
        locationName: result.locationName ?? undefined,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });
}

function createUnavailableDeps(): StockBalanceLocationDeps {
  return {
    permissionService: {
      async assertHasPermission() {
        throw new AppError({
          code: "internal_error",
          detail: "Stock balance permission services are not configured.",
          statusCode: 503,
          title: "Stock unavailable",
        });
      },
    },
    stockBalanceQueryRepo: {
      async listStockBalancesByLocationId() {
        throw new AppError({
          code: "internal_error",
          detail: "Stock balance services are not configured.",
          statusCode: 503,
          title: "Stock unavailable",
        });
      },
    },
  };
}

async function assertLocationPermission(
  deps: StockBalanceLocationDeps,
  input: {
    actor: AuthenticatedActor;
    locationId: string;
    permission: "stock.view" | "worker.stock.view";
  },
) {
  await deps.permissionService.assertHasPermission({
    locationId: input.locationId,
    permission: input.permission,
    user: input.actor,
  });
}

function getAuthenticatedActor(request: {
  auth?: AuthenticatedActor;
}): AuthenticatedActor {
  if (request.auth) return request.auth;

  throw new AppError({
    code: "internal_error",
    detail: "Authenticated actor context is unavailable for this route.",
    statusCode: 500,
    title: "Authorization unavailable",
  });
}
