import type { FastifyInstance } from "fastify";
import { SupplyRequestAccessPolicy } from "./supply-request-access-policy.js";
import { registerManagerSupplyRequestRoutes } from "./supply-request-manager.routes.js";
import type { StockSupplyRouteDependencies } from "./supply-request-route-support.js";
import { createUnavailableDependencies } from "./supply-request-unavailable-dependencies.js";
import { registerSupplyRequestUtilityRoutes } from "./supply-request-utility.routes.js";
import { registerWorkerSupplyRequestRoutes } from "./supply-request-worker.routes.js";

// Route access metadata is declared in supply-request-route-support.ts and
// applied by the worker/manager/utility route modules via config: { access: ... }.
export function registerStockSupplyRoutes(
  server: FastifyInstance,
  dependencies: StockSupplyRouteDependencies = createUnavailableDependencies(),
) {
  const accessPolicy = new SupplyRequestAccessPolicy(
    dependencies.permissionService,
  );

  registerWorkerSupplyRequestRoutes(server, dependencies, accessPolicy);
  registerManagerSupplyRequestRoutes(server, dependencies, accessPolicy);
  registerSupplyRequestUtilityRoutes(server, dependencies, accessPolicy);
}
