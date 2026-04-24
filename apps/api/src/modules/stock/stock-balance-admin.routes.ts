import {
  adminStockBalanceListResponseSchema,
  adminStockBalanceQuerySchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { StockBalanceQueryRepository } from "./postgres-stock-balance-query.repository.js";

type StockBalanceDeps = {
  stockBalanceQueryRepo: Pick<StockBalanceQueryRepository, "listStockBalances">;
};

const stockBalanceListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.read" },
  method: "GET",
  url: "/api/admin/stock/balances",
};

export function registerStockBalanceRoutes(
  server: FastifyInstance,
  deps: StockBalanceDeps = createUnavailableDeps(),
) {
  server.route({
    config: { access: stockBalanceListRoute.access },
    method: stockBalanceListRoute.method,
    url: stockBalanceListRoute.url,
    async handler(request) {
      const query = adminStockBalanceQuerySchema.parse(request.query);
      const result = await deps.stockBalanceQueryRepo.listStockBalances(query);

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

function createUnavailableDeps(): StockBalanceDeps {
  return {
    stockBalanceQueryRepo: {
      async listStockBalances() {
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
