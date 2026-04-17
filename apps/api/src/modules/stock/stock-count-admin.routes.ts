import { adminStockCountRequestSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { AdminStockCountRepository } from "./postgres-admin-stock-count.repository.js";

type StockCountDeps = {
  stockCountRepo: Pick<AdminStockCountRepository, "setOnHandQuantity">;
};

const stockCountRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "POST",
  url: "/api/admin/stock/balances/count",
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
      const countedBy = getAuthenticatedUserId(request);
      return deps.stockCountRepo.setOnHandQuantity({ ...body, countedBy });
    },
  });
}

function createUnavailableDeps(): StockCountDeps {
  return {
    stockCountRepo: {
      async setOnHandQuantity() {
        throw new AppError({
          code: "internal_error",
          detail: "Stock count services are not configured.",
          statusCode: 503,
          title: "Stock unavailable",
        });
      },
    },
  };
}
