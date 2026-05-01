import {
  locationStaffListQuerySchema,
  locationStaffListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PostgresWorkerAssignmentQueryRepository } from "./postgres-worker-assignment-query.repository.js";

type ManagerStaffRouteDependencies = {
  assignmentQueryRepository: Pick<
    PostgresWorkerAssignmentQueryRepository,
    "getLocationStaff"
  >;
};

const managerStaffRoute: RouteDefinition = {
  access: { kind: "permission", permission: "staff.view", scope: "contextual" },
  method: "GET",
  url: "/api/manager/staff",
};

export function registerManagerStaffRoutes(
  server: FastifyInstance,
  dependencies: ManagerStaffRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: managerStaffRoute.access },
    method: managerStaffRoute.method,
    url: managerStaffRoute.url,
    async handler(request) {
      const query = locationStaffListQuerySchema.parse(request.query);
      // The contextual route guard already enforces that the actor holds
      // staff.view on this specific locationId via the access-control
      // middleware (resolvePermissions filters by the supplied locationId).
      const staff =
        await dependencies.assignmentQueryRepository.getLocationStaff(
          query.locationId,
        );

      return locationStaffListResponseSchema.parse({
        items: staff.map((member) => ({
          activeAssignmentCount: member.activeAssignmentCount,
          assignedAt: toIsoTimestamp(member.assignedAt),
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          lastSaleAt: toIsoTimestamp(member.lastSaleAt),
          netSalesAmount: member.netSalesAmount,
          primaryImageUrl: member.primaryImageUrl,
          roleName: member.roleName,
          roleSlug: member.roleSlug,
          returnsCount: member.returnsCount,
          returnsTotalAmount: member.returnsTotalAmount,
          salesCount: member.salesCount,
          salesTotalAmount: member.salesTotalAmount,
          status: member.status,
          userId: member.userId,
          userSlug: member.userSlug,
        })),
        locationId: query.locationId,
        locationName: staff[0]?.locationName ?? "",
      });
    },
  });
}

function createUnavailableDependencies(): ManagerStaffRouteDependencies {
  return {
    assignmentQueryRepository: {
      async getLocationStaff() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Manager staff services are not configured for this environment.",
          statusCode: 503,
          title: "Manager staff unavailable",
        });
      },
    },
  };
}

function toIsoTimestamp(value: Date | string): string;
function toIsoTimestamp(value: Date | string | null): string | null;
function toIsoTimestamp(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
