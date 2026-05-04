import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import type { StockTakeService } from "./stock-take.service.js";

export type StockTakeRouteDeps = {
  permissionService?: Pick<PermissionResolutionService, "assertHasPermission">;
  stockTakeService: Pick<
    StockTakeService,
    | "createSession"
    | "findLocationBySlug"
    | "findSessionLocationByReference"
    | "getSession"
  >;
};

export function createUnavailableStockTakeDeps(): StockTakeRouteDeps {
  return {
    stockTakeService: {
      async createSession() {
        throw unavailableStockTakeError();
      },
      async findLocationBySlug() {
        throw unavailableStockTakeError();
      },
      async findSessionLocationByReference() {
        throw unavailableStockTakeError();
      },
      async getSession() {
        throw unavailableStockTakeError();
      },
    },
  };
}

export function getStockTakePermissionService(deps: StockTakeRouteDeps) {
  if (deps.permissionService) return deps.permissionService;

  throw new AppError({
    code: "internal_error",
    detail: "Stock-take permission services are not configured.",
    statusCode: 503,
    title: "Stock take unavailable",
  });
}

export function locationNotFoundError(locationSlug: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Location "${locationSlug}" was not found.`,
    statusCode: 404,
    title: "Location not found",
  });
}

export function stockTakeNotFoundError(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Stock take "${reference}" was not found.`,
    statusCode: 404,
    title: "Stock take not found",
  });
}

function unavailableStockTakeError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Stock-take services are not configured.",
    statusCode: 503,
    title: "Stock take unavailable",
  });
}
