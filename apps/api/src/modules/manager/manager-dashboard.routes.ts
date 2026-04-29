import {
  managerDashboardSummaryQuerySchema,
  managerDashboardSummaryResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { PostgresInvoiceQueryRepository } from "../sales/postgres-invoice-query.repository.js";
import type { PostgresStockBalanceQueryRepository } from "../stock/postgres-stock-balance-query.repository.js";
import type { PostgresSupplyRequestRepository } from "../stock/postgres-supply-request.repository.js";
import {
  listAllLocationStockBalances,
  listAllLocationTransfers,
  listAllManagerSales,
  summarizeManagerInventory,
  summarizeManagerSales,
  summarizeManagerTransfers,
  toTodayStart,
} from "./manager-dashboard.support.js";

export type ManagerDashboardRouteDependencies = {
  invoiceRepository: Pick<PostgresInvoiceQueryRepository, "listByLocation">;
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">;
  stockBalanceQueryRepo: Pick<
    PostgresStockBalanceQueryRepository,
    "listStockBalancesByLocationId"
  >;
  supplyRequestRepository: Pick<PostgresSupplyRequestRepository, "listByLocation">;
};

const managerDashboardRoute = {
  access: { kind: "permission", permission: "stock.view", scope: "any_active" },
  method: "GET" as const,
  url: "/api/manager/dashboard/summary",
};

export function registerManagerDashboardRoutes(
  server: FastifyInstance,
  dependencies: ManagerDashboardRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: managerDashboardRoute.access },
    method: managerDashboardRoute.method,
    url: managerDashboardRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = managerDashboardSummaryQuerySchema.parse(request.query);

      await dependencies.permissionService.assertHasPermission({
        locationId: query.locationId,
        permission: "stock.view",
        user: { userId },
      });

      const [stockResult, canViewSales, canManageTransfers] = await Promise.all([
        listAllLocationStockBalances(
          dependencies.stockBalanceQueryRepo,
          query.locationId,
        ),
        hasPermission(dependencies.permissionService, {
          locationId: query.locationId,
          permission: "pos.sales.view",
          userId,
        }),
        hasPermission(dependencies.permissionService, {
          locationId: query.locationId,
          permission: "stock.supply.manage",
          userId,
        }),
      ]);

      const inventorySummary = summarizeManagerInventory(stockResult.items);
      const [salesSummary, transferSummary] = await Promise.all([
        canViewSales
          ? listAllManagerSales(dependencies.invoiceRepository, {
              dateFrom: toTodayStart(),
              locationId: query.locationId,
            }).then(summarizeManagerSales)
          : Promise.resolve(null),
        canManageTransfers
          ? listAllLocationTransfers(
              dependencies.supplyRequestRepository,
              query.locationId,
            ).then(summarizeManagerTransfers)
          : Promise.resolve(null),
      ]);

      return managerDashboardSummaryResponseSchema.parse({
        locationId: query.locationId,
        lowStockCount: inventorySummary.lowStockCount,
        sales: salesSummary,
        skuCount: inventorySummary.skuCount,
        transfers: transferSummary,
      });
    },
  });
}

async function hasPermission(
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">,
  input: { locationId: string; permission: string; userId: string },
) {
  try {
    await permissionService.assertHasPermission({
      locationId: input.locationId,
      permission: input.permission,
      user: { userId: input.userId },
    });
    return true;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 403) {
      return false;
    }
    throw error;
  }
}

function createUnavailableDependencies(): ManagerDashboardRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail: "Manager dashboard services are not configured for this environment.",
      statusCode: 503,
      title: "Manager dashboard unavailable",
    });
  };

  return {
    invoiceRepository: {
      async listByLocation() {
        return unavailable();
      },
    },
    permissionService: {
      async assertHasPermission() {
        return unavailable();
      },
    },
    stockBalanceQueryRepo: {
      async listStockBalancesByLocationId() {
        return unavailable();
      },
    },
    supplyRequestRepository: {
      async listByLocation() {
        return unavailable();
      },
    },
  };
}
