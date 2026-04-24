import type { PosSaleRouteDependencies } from "./pos-sale.routes.js";
import { unavailableSalesError } from "./sales-route-access.js";

export function createUnavailablePosSaleDependencies(): PosSaleRouteDependencies {
  return {
    invoiceRepository: {
      async findByReference() {
        throw unavailableSalesError();
      },
      async listByLocation() {
        throw unavailableSalesError();
      },
      async listByWorker() {
        throw unavailableSalesError();
      },
    },
    permissionService: {
      async assertHasPermission() {
        throw unavailableSalesError();
      },
    },
    posSaleService: {
      async processReturn() {
        throw unavailableSalesError();
      },
      async processSale() {
        throw unavailableSalesError();
      },
    },
  };
}
