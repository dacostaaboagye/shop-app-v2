import {
  adminStockBalanceListResponseSchema,
  locationStockBalanceQuerySchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { StockBalanceQueryRepository } from "./postgres-stock-balance-query.repository.js";

type StockBalanceLocationDeps = {
  stockBalanceQueryRepo: Pick<
    StockBalanceQueryRepository,
    "listStockBalancesByLocationId"
  >;
};

const workerStockBalanceRoute: RouteDefinition = {
  access: { kind: "permission", permission: "worker.stock.view", scope: "any_active" },
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
      const query = locationStockBalanceQuerySchema.parse(request.query);
      const result = await deps.stockBalanceQueryRepo.listStockBalancesByLocationId(query);
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
      const query = locationStockBalanceQuerySchema.parse(request.query);
      const result = await deps.stockBalanceQueryRepo.listStockBalancesByLocationId(query);
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
