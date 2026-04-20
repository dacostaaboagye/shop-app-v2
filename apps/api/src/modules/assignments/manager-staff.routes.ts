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
  access: { kind: "permission", permission: "staff.view", scope: "any_active" },
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
      const staff =
        await dependencies.assignmentQueryRepository.getLocationStaff(
          query.locationId,
        );

      return locationStaffListResponseSchema.parse({
        items: staff.map((member) => ({
          activeAssignmentCount: member.activeAssignmentCount,
          assignedAt: member.assignedAt.toISOString(),
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          roleName: member.roleName,
          roleSlug: member.roleSlug,
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
