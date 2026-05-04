import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import type { StockTakeService } from "./stock-take.service.js";
import type { StockTakeImportService } from "./stock-take-import.service.js";

export type StockTakeImportRouteDeps = {
  permissionService?: Pick<PermissionResolutionService, "assertHasPermission">;
  stockTakeImportService: Pick<StockTakeImportService, "dryRun">;
  stockTakeService: Pick<StockTakeService, "findSessionLocationByReference">;
};

export function createUnavailableStockTakeImportDeps(): StockTakeImportRouteDeps {
  return {
    stockTakeImportService: {
      async dryRun() {
        throw unavailableStockTakeImportError();
      },
    },
    stockTakeService: {
      async findSessionLocationByReference() {
        throw unavailableStockTakeImportError();
      },
    },
  };
}

export function getStockTakeImportPermissionService(
  deps: StockTakeImportRouteDeps,
) {
  if (deps.permissionService) return deps.permissionService;

  throw new AppError({
    code: "internal_error",
    detail: "Stock-take import permission services are not configured.",
    statusCode: 503,
    title: "Stock take import unavailable",
  });
}

export function stockTakeImportNotFoundError(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Stock take "${reference}" was not found.`,
    statusCode: 404,
    title: "Stock take not found",
  });
}

function unavailableStockTakeImportError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Stock-take import services are not configured.",
    statusCode: 503,
    title: "Stock take import unavailable",
  });
}
