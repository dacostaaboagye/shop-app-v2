import {
  workerDashboardSummaryQuerySchema,
  workerDashboardSummaryResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { NotificationQueryService } from "../notifications/notification-query.service.js";
import { toInvoiceResponse } from "../sales/invoice-response.mapper.js";
import type { PostgresInvoiceQueryRepository } from "../sales/postgres-invoice-query.repository.js";
import type { PostgresWorkerAssignmentQueryRepository } from "./postgres-worker-assignment-query.repository.js";
import { assignmentRoutes } from "./stock-assignment-route-support.js";
import {
  listAllWorkerSales,
  summarizeWorkerDashboardMetrics,
  summarizeWorkerStock,
  toRecentWindowStart,
  toTodayStart,
} from "./worker-dashboard.support.js";

const DASHBOARD_NOTIFICATION_LIMIT = 4;
const DASHBOARD_RECENT_SALES_LIMIT = 5;

export type WorkerDashboardRouteDependencies = {
  assignmentQueryRepository: Pick<
    PostgresWorkerAssignmentQueryRepository,
    "getWorkerAssignments"
  >;
  invoiceRepository: Pick<PostgresInvoiceQueryRepository, "listByWorker">;
  notificationQueryService: Pick<NotificationQueryService, "listNotifications">;
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">;
};

const workerDashboardRoute = {
  access: assignmentRoutes.workerList.access,
  method: "GET" as const,
  url: "/api/worker/dashboard/summary",
};

export function registerWorkerDashboardRoutes(
  server: FastifyInstance,
  dependencies: WorkerDashboardRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: workerDashboardRoute.access },
    method: workerDashboardRoute.method,
    url: workerDashboardRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = workerDashboardSummaryQuerySchema.parse(request.query);
      const [assignments, notificationResponse, canViewSales] =
        await Promise.all([
          dependencies.assignmentQueryRepository.getWorkerAssignments({
            locationId: query.locationId,
            workerId: userId,
          }),
          dependencies.notificationQueryService.listNotifications({
            limit: DASHBOARD_NOTIFICATION_LIMIT,
            userId,
          }),
          hasWorkerSalesViewAccess(dependencies, {
            locationId: query.locationId,
            userId,
          }),
        ]);

      const stockSummary = summarizeWorkerStock(
        assignments.map((assignment) => ({
          ...assignment,
          effectiveFrom: assignment.effectiveFrom.toISOString(),
        })),
      );
      const latestNotifications = notificationResponse.items.filter(
        (item) => item.status === "unread",
      );

      if (!canViewSales) {
        return workerDashboardSummaryResponseSchema.parse({
          latestNotifications: latestNotifications.slice(0, 3),
          latestSales: [],
          locationId: query.locationId,
          metrics: null,
          stockSummary,
        });
      }

      const [recentSales, todaySales] = await Promise.all([
        listAllWorkerSales(dependencies.invoiceRepository, {
          classification: "outgoing",
          dateFrom: toRecentWindowStart(7),
          locationId: query.locationId,
          workerId: userId,
        }),
        listAllWorkerSales(dependencies.invoiceRepository, {
          classification: "outgoing",
          dateFrom: toTodayStart(),
          locationId: query.locationId,
          workerId: userId,
        }),
      ]);

      return workerDashboardSummaryResponseSchema.parse({
        latestNotifications: latestNotifications.slice(0, 3),
        latestSales: todaySales
          .slice(0, DASHBOARD_RECENT_SALES_LIMIT)
          .map((invoice) => toInvoiceResponse({ ...invoice, lines: [] })),
        locationId: query.locationId,
        metrics: summarizeWorkerDashboardMetrics({
          lowStockCount:
            stockSummary.lowStockCount + stockSummary.outOfStockCount,
          recentSales,
          todaySales,
          unreadNotificationCount: notificationResponse.unreadCount,
        }),
        stockSummary,
      });
    },
  });
}

async function hasWorkerSalesViewAccess(
  dependencies: WorkerDashboardRouteDependencies,
  input: { locationId: string; userId: string },
) {
  try {
    await dependencies.permissionService.assertHasPermission({
      locationId: input.locationId,
      permission: "pos.sales.view",
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

function createUnavailableDependencies(): WorkerDashboardRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail:
        "Worker dashboard services are not configured for this environment.",
      statusCode: 503,
      title: "Worker dashboard unavailable",
    });
  };

  return {
    assignmentQueryRepository: {
      async getWorkerAssignments() {
        return unavailable();
      },
    },
    invoiceRepository: {
      async listByWorker() {
        return unavailable();
      },
    },
    notificationQueryService: {
      async listNotifications() {
        return unavailable();
      },
    },
    permissionService: {
      async assertHasPermission() {
        return unavailable();
      },
    },
  };
}
