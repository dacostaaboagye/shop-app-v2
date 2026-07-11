import type { FastifyInstance } from "fastify";
import { registerAssignmentHistoryRoutes } from "./stock-assignment-history.routes.js";
import { registerManagerStockAssignmentRoutes } from "./stock-assignment-manager.routes.js";
import {
  createUnavailableDependencies,
  type StockAssignmentRouteDependencies,
} from "./stock-assignment-route-support.js";
import { registerWorkerStockAssignmentRoutes } from "./stock-assignment-worker.routes.js";

// Route access metadata is declared in stock-assignment-route-support.ts and
// applied by the manager/worker route modules via config: { access: ... }.
export function registerStockAssignmentRoutes(
  server: FastifyInstance,
  dependencies: StockAssignmentRouteDependencies = createUnavailableDependencies(),
) {
  registerManagerStockAssignmentRoutes(server, dependencies);
  registerWorkerStockAssignmentRoutes(server, dependencies);
  registerAssignmentHistoryRoutes(server, dependencies);
}
