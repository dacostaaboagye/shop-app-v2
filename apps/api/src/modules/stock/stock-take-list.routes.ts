import {
  stockTakeSessionListQuerySchema,
  stockTakeSessionListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import {
  getStockTakePermissionService,
  locationNotFoundError,
  type StockTakeRouteDeps,
} from "./stock-take-route-support.js";

const adminListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.read" },
  method: "GET",
  url: "/api/admin/stock-takes",
};
const managerListRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.read",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/manager/stock-takes",
};

export function registerStockTakeListRoutes(
  server: FastifyInstance,
  deps: StockTakeRouteDeps,
) {
  registerListRoute(server, deps, "admin", adminListRoute);
  registerListRoute(server, deps, "manager", managerListRoute);
}

function registerListRoute(
  server: FastifyInstance,
  deps: StockTakeRouteDeps,
  portal: "admin" | "manager",
  route: RouteDefinition,
) {
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const query = stockTakeSessionListQuerySchema.parse(request.query);
      if (portal === "manager") {
        await assertManagerLocationReadAllowed(
          deps,
          query.locationSlug,
          request,
        );
      }

      const response = await deps.stockTakeListService.listSessions({
        portal,
        query,
      });
      return stockTakeSessionListResponseSchema.parse(response);
    },
  });
}

async function assertManagerLocationReadAllowed(
  deps: StockTakeRouteDeps,
  locationSlug: string | undefined,
  request: Parameters<typeof getAuthenticatedActor>[0],
) {
  if (!locationSlug) {
    throw new AppError({
      code: "validation_error",
      detail: "Choose a managed location before viewing stock-take sessions.",
      statusCode: 400,
      title: "Location required",
    });
  }

  const location = await deps.stockTakeService.findLocationBySlug(locationSlug);
  if (!location) throw locationNotFoundError(locationSlug);

  await getStockTakePermissionService(deps).assertHasPermission({
    locationId: location.id,
    permission: "inventory.read",
    user: getAuthenticatedActor(request),
  });
}
