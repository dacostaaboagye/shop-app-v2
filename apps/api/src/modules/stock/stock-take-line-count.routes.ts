import {
  stockTakeLineCountUpdateRequestSchema,
  stockTakeLineCountUpdateResponseSchema,
  stockTakeReferenceParamsSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import {
  getStockTakePermissionService,
  type StockTakeRouteDeps,
  stockTakeNotFoundError,
} from "./stock-take-route-support.js";

const adminUpdateRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "PATCH",
  url: "/api/admin/stock-takes/:reference/lines",
};
const managerUpdateRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.write",
    scope: "any_active",
  },
  method: "PATCH",
  url: "/api/manager/stock-takes/:reference/lines",
};

export const stockTakeLineCountWriteRateLimit = {
  groupId: "stock-take-line-count-write",
  max: 60,
  timeWindow: "1 minute",
};

export function registerStockTakeLineCountRoutes(
  server: FastifyInstance,
  deps: StockTakeRouteDeps,
) {
  registerLineCountRoute(server, deps, "admin", adminUpdateRoute);
  registerLineCountRoute(server, deps, "manager", managerUpdateRoute);
}

function registerLineCountRoute(
  server: FastifyInstance,
  deps: StockTakeRouteDeps,
  portal: "admin" | "manager",
  route: RouteDefinition,
) {
  server.route({
    config: {
      access: route.access,
      rateLimit: stockTakeLineCountWriteRateLimit,
    },
    method: route.method,
    url: route.url,
    async handler(request) {
      const { reference } = stockTakeReferenceParamsSchema.parse(
        request.params,
      );
      const actor = getAuthenticatedActor(request);
      await assertSessionWriteAllowed(deps, portal, reference, actor);
      const body = stockTakeLineCountUpdateRequestSchema.parse(request.body);

      return stockTakeLineCountUpdateResponseSchema.parse(
        await deps.stockTakeLifecycleService.updateLineCounts({
          entries: body.entries,
          reference,
        }),
      );
    },
  });
}

async function assertSessionWriteAllowed(
  deps: StockTakeRouteDeps,
  portal: "admin" | "manager",
  reference: string,
  actor: { userId: string; userSlug: string },
) {
  if (portal === "admin") return;

  const location =
    await deps.stockTakeService.findSessionLocationByReference(reference);
  if (!location) throw stockTakeNotFoundError(reference);

  await getStockTakePermissionService(deps).assertHasPermission({
    locationId: location.id,
    permission: "inventory.write",
    user: actor,
  });
}
