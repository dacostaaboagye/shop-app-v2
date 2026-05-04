import {
  stockTakeCreateRequestSchema,
  stockTakeReferenceParamsSchema,
  stockTakeSessionDetailSchema,
  stockTakeSessionSummarySchema,
} from "@shop/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { StockTakeService } from "./stock-take.service.js";
import {
  buildStockTakeCsv,
  createStockTakeCsvFilename,
} from "./stock-take-csv.js";
import { registerStockTakePdfRoutes } from "./stock-take-pdf.routes.js";
import {
  createUnavailableStockTakeDeps,
  getStockTakePermissionService,
  locationNotFoundError,
  type StockTakeRouteDeps,
  stockTakeNotFoundError,
} from "./stock-take-route-support.js";

const adminCreateRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "POST",
  url: "/api/admin/stock-takes",
};
const managerCreateRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.write",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/manager/stock-takes",
};
const adminReadRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.read" },
  method: "GET",
  url: "/api/admin/stock-takes/:reference",
};
const managerReadRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.read",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/manager/stock-takes/:reference",
};

export function registerStockTakeRoutes(
  server: FastifyInstance,
  deps: StockTakeRouteDeps = createUnavailableStockTakeDeps(),
) {
  server.route({
    config: { access: adminCreateRoute.access },
    method: adminCreateRoute.method,
    url: adminCreateRoute.url,
    async handler(request) {
      const body = stockTakeCreateRequestSchema.parse(request.body);
      const actor = getAuthenticatedActor(request);
      const session = await deps.stockTakeService.createSession({
        generatedBy: actor.userId,
        generatedBySlug: actor.userSlug,
        portal: "admin",
        request: body,
      });

      return stockTakeSessionSummarySchema.parse(session);
    },
  });

  server.route({
    config: { access: managerCreateRoute.access },
    method: managerCreateRoute.method,
    url: managerCreateRoute.url,
    async handler(request) {
      const body = stockTakeCreateRequestSchema.parse(request.body);
      const actor = getAuthenticatedActor(request);
      const location = await deps.stockTakeService.findLocationBySlug(
        body.locationSlug,
      );

      if (!location) throw locationNotFoundError(body.locationSlug);

      await getStockTakePermissionService(deps).assertHasPermission({
        locationId: location.id,
        permission: "inventory.write",
        user: actor,
      });

      const session = await deps.stockTakeService.createSession({
        generatedBy: actor.userId,
        generatedBySlug: actor.userSlug,
        portal: "manager",
        request: body,
      });

      return stockTakeSessionSummarySchema.parse(session);
    },
  });

  registerReadRoutes(server, deps, "admin", adminReadRoute);
  registerReadRoutes(server, deps, "manager", managerReadRoute);
  registerCsvRoutes(server, deps, "admin", {
    ...adminReadRoute,
    url: "/api/admin/stock-takes/:reference/sheet.csv",
  });
  registerCsvRoutes(server, deps, "manager", {
    ...managerReadRoute,
    url: "/api/manager/stock-takes/:reference/sheet.csv",
  });
  registerStockTakePdfRoutes(server, deps);
}

function registerReadRoutes(
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
      await assertSessionReadAllowed(deps, portal, reference, actor);

      return stockTakeSessionDetailSchema.parse(
        await deps.stockTakeService.getSession({ portal, reference }),
      );
    },
  });
}

function registerCsvRoutes(
  server: FastifyInstance,
  deps: StockTakeRouteDeps,
  portal: "admin" | "manager",
  route: RouteDefinition,
) {
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request, reply) {
      const { reference } = stockTakeReferenceParamsSchema.parse(
        request.params,
      );
      const actor = getAuthenticatedActor(request);
      await assertSessionReadAllowed(deps, portal, reference, actor);
      const session = await deps.stockTakeService.getSession({
        portal,
        reference,
      });

      return sendCsv(reply, session);
    },
  });
}

async function assertSessionReadAllowed(
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
    permission: "inventory.read",
    user: actor,
  });
}

function sendCsv(
  reply: FastifyReply,
  session: Awaited<ReturnType<StockTakeService["getSession"]>>,
) {
  const filename = createStockTakeCsvFilename({
    locationSlug: session.locationSlug,
    stockTakeReference: session.stockTakeReference,
  });

  return reply
    .header("Content-Disposition", `attachment; filename="${filename}"`)
    .type("text/csv; charset=utf-8")
    .send(buildStockTakeCsv(session));
}
