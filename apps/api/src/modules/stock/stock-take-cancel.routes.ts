import {
  stockTakeReferenceParamsSchema,
  stockTakeSessionSummarySchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import {
  getStockTakePermissionService,
  type StockTakeRouteDeps,
  stockTakeNotFoundError,
} from "./stock-take-route-support.js";

const adminCancelRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "POST",
  url: "/api/admin/stock-takes/:reference/cancel",
};
const managerCancelRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.write",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/manager/stock-takes/:reference/cancel",
};

export function registerStockTakeCancelRoutes(
  server: FastifyInstance,
  deps: StockTakeRouteDeps,
) {
  registerCancelRoute(server, deps, "admin", adminCancelRoute);
  registerCancelRoute(server, deps, "manager", managerCancelRoute);
}

function registerCancelRoute(
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
      const { reference } = stockTakeReferenceParamsSchema.parse(
        request.params,
      );
      const actor = getAuthenticatedActor(request);
      await assertSessionWriteAllowed(deps, portal, reference, actor);
      const current = await deps.stockTakeService.getSession({
        portal,
        reference,
      });

      if (current.status === "applied" || current.status === "cancelled") {
        throw new AppError({
          code: "conflict",
          detail: `Stock take "${reference}" is ${current.status} and cannot be deleted.`,
          statusCode: 409,
          title: "Stock take cannot be deleted",
        });
      }

      return stockTakeSessionSummarySchema.parse(
        await deps.stockTakeLifecycleService.cancelSession({
          cancelledBy: actor.userId,
          portal,
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
