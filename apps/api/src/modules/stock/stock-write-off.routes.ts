import {
  stockWriteOffRequestSchema,
  stockWriteOffResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { PostgresStockWriteOffRepository } from "./postgres-stock-write-off.repository.js";

type StockWriteOffDeps = {
  permissionService?: Pick<PermissionResolutionService, "assertHasPermission">;
  stockWriteOffRepo: Pick<
    PostgresStockWriteOffRepository,
    "findLocationBySlug" | "writeOffStock"
  >;
};

const adminWriteOffRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "POST",
  url: "/api/admin/stock/balances/write-off",
};

const managerWriteOffRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.write",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/manager/stock/balances/write-off",
};

export function registerStockWriteOffRoutes(
  server: FastifyInstance,
  deps: StockWriteOffDeps = createUnavailableDeps(),
) {
  server.route({
    config: { access: adminWriteOffRoute.access },
    method: adminWriteOffRoute.method,
    url: adminWriteOffRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = stockWriteOffRequestSchema.parse(request.body);
      const response = await deps.stockWriteOffRepo.writeOffStock({
        ...body,
        actorUserId: actor.userId,
      });
      return stockWriteOffResponseSchema.parse(response);
    },
  });

  server.route({
    config: { access: managerWriteOffRoute.access },
    method: managerWriteOffRoute.method,
    url: managerWriteOffRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const body = stockWriteOffRequestSchema.parse(request.body);
      const location = await deps.stockWriteOffRepo.findLocationBySlug(
        body.locationSlug,
      );

      if (!location) {
        throw new AppError({
          code: "not_found",
          detail: "The selected stock location could not be found.",
          statusCode: 404,
          title: "Location not found",
        });
      }

      await getPermissionService(deps).assertHasPermission({
        locationId: location.id,
        permission: "inventory.write",
        user: actor,
      });

      const response = await deps.stockWriteOffRepo.writeOffStock({
        ...body,
        actorUserId: actor.userId,
      });
      return stockWriteOffResponseSchema.parse(response);
    },
  });
}

function createUnavailableDeps(): StockWriteOffDeps {
  return {
    stockWriteOffRepo: {
      async findLocationBySlug() {
        throw unavailableError();
      },
      async writeOffStock() {
        throw unavailableError();
      },
    },
  };
}

function getPermissionService(deps: StockWriteOffDeps) {
  if (deps.permissionService) return deps.permissionService;

  throw new AppError({
    code: "internal_error",
    detail: "Stock permission services are not configured.",
    statusCode: 503,
    title: "Stock unavailable",
  });
}

function unavailableError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Stock write-off services are not configured.",
    statusCode: 503,
    title: "Stock unavailable",
  });
}
