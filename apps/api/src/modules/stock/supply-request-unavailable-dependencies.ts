import { AppError } from "../_core/errors/app-error.js";
import type { StockSupplyRouteDependencies } from "./supply-request-route-support.js";

export function createUnavailableDependencies(): StockSupplyRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail: "Stock supply services are not configured for this environment.",
      statusCode: 503,
      title: "Stock supply unavailable",
    });
  };

  return {
    locationRepository: {
      async listActiveLocations() {
        return unavailable();
      },
    },
    permissionService: {
      async assertHasPermission() {
        return unavailable();
      },
      async resolveAllPermissions() {
        return unavailable();
      },
      async resolvePermissionsForAnyScope() {
        return unavailable();
      },
    },
    referenceNumberService: {
      async generateReference() {
        return unavailable();
      },
    },
    supplyRequestRepository: {
      async findById() {
        return unavailable();
      },
      async findGtnById() {
        return unavailable();
      },
      async findGtnBySupplyRequest() {
        return unavailable();
      },
      async listByLocation() {
        return unavailable();
      },
      async listByRequester() {
        return unavailable();
      },
      async listBySourceLocations() {
        return unavailable();
      },
      async listBySourceLocation() {
        return unavailable();
      },
    },
    supplyService: {
      async approve() {
        return unavailable();
      },
      async cancel() {
        return unavailable();
      },
      async cancelById() {
        return unavailable();
      },
      async confirmReceipt() {
        return unavailable();
      },
      async createRequest() {
        return unavailable();
      },
      async dispatch() {
        return unavailable();
      },
      async reject() {
        return unavailable();
      },
    },
    variantSnapshotRepository: {
      async getVariantSnapshot() {
        return unavailable();
      },
    },
  };
}
