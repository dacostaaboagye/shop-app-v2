import {
  stockTakeApplyRequestSchema,
  stockTakeApplyResponseSchema,
  stockTakeImportDryRunRequestSchema,
  stockTakeImportDryRunResponseSchema,
  stockTakeReferenceParamsSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import {
  createUnavailableStockTakeImportDeps,
  getStockTakeImportPermissionService,
  type StockTakeImportRouteDeps,
  stockTakeImportNotFoundError,
} from "./stock-take-import-route-support.js";

const adminDryRunRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "POST",
  url: "/api/admin/stock-takes/:reference/imports/dry-run",
};
const adminApplyRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "POST",
  url: "/api/admin/stock-takes/:reference/apply",
};
const managerDryRunRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.write",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/manager/stock-takes/:reference/imports/dry-run",
};
const managerApplyRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.write",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/manager/stock-takes/:reference/apply",
};
const stockTakeImportBodyLimitBytes = 5_250_000;

export function registerStockTakeImportRoutes(
  server: FastifyInstance,
  deps: StockTakeImportRouteDeps = createUnavailableStockTakeImportDeps(),
) {
  registerDryRunRoute(server, deps, "admin", adminDryRunRoute);
  registerDryRunRoute(server, deps, "manager", managerDryRunRoute);
  registerApplyRoute(server, deps, "admin", adminApplyRoute);
  registerApplyRoute(server, deps, "manager", managerApplyRoute);
}

function registerDryRunRoute(
  server: FastifyInstance,
  deps: StockTakeImportRouteDeps,
  portal: "admin" | "manager",
  route: RouteDefinition,
) {
  server.route({
    bodyLimit: stockTakeImportBodyLimitBytes,
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const { reference } = stockTakeReferenceParamsSchema.parse(
        request.params,
      );
      const actor = getAuthenticatedActor(request);
      await assertDryRunAllowed(deps, portal, reference, actor);
      const body = stockTakeImportDryRunRequestSchema.parse(request.body);

      return stockTakeImportDryRunResponseSchema.parse(
        await deps.stockTakeImportService.dryRun({
          reference,
          request: body,
        }),
      );
    },
  });
}

function registerApplyRoute(
  server: FastifyInstance,
  deps: StockTakeImportRouteDeps,
  portal: "admin" | "manager",
  route: RouteDefinition,
) {
  server.route({
    bodyLimit: stockTakeImportBodyLimitBytes,
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const { reference } = stockTakeReferenceParamsSchema.parse(
        request.params,
      );
      const actor = getAuthenticatedActor(request);
      await assertDryRunAllowed(deps, portal, reference, actor);
      const body = stockTakeApplyRequestSchema.parse(request.body);

      return stockTakeApplyResponseSchema.parse(
        await deps.stockTakeApplyService.apply({
          appliedBy: actor.userId,
          appliedBySlug: actor.userSlug,
          reference,
          request: body,
        }),
      );
    },
  });
}

async function assertDryRunAllowed(
  deps: StockTakeImportRouteDeps,
  portal: "admin" | "manager",
  reference: string,
  actor: { userId: string; userSlug: string },
) {
  if (portal === "admin") return;

  const location =
    await deps.stockTakeService.findSessionLocationByReference(reference);
  if (!location) throw stockTakeImportNotFoundError(reference);

  await getStockTakeImportPermissionService(deps).assertHasPermission({
    locationId: location.id,
    permission: "inventory.write",
    user: actor,
  });
}
