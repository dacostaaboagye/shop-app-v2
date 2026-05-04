import { stockTakeReferenceParamsSchema } from "@shop/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import {
  getStockTakePermissionService,
  type StockTakeRouteDeps,
  stockTakeNotFoundError,
} from "./stock-take-route-support.js";
import { toStockTakeXlsxFile } from "./stock-take-xlsx.js";

const adminReadRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.read" },
  method: "GET",
  url: "/api/admin/stock-takes/:reference/sheet.xlsx",
};

const managerReadRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.read",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/manager/stock-takes/:reference/sheet.xlsx",
};

export function registerStockTakeXlsxRoutes(
  server: FastifyInstance,
  deps: StockTakeRouteDeps,
) {
  registerWorkbookRoute(server, deps, "admin", adminReadRoute);
  registerWorkbookRoute(server, deps, "manager", managerReadRoute);
}

function registerWorkbookRoute(
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

      return sendXlsx(reply, await toStockTakeXlsxFile(session));
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

function sendXlsx(
  reply: FastifyReply,
  file: Awaited<ReturnType<typeof toStockTakeXlsxFile>>,
) {
  return reply
    .header("Content-Disposition", contentDispositionAttachment(file.filename))
    .header("Content-Type", file.contentType)
    .send(file.body);
}

function contentDispositionAttachment(filename: string): string {
  const safeFilename = filename.replace(/["\r\n]/g, "-");
  return `attachment; filename="${safeFilename}"`;
}
