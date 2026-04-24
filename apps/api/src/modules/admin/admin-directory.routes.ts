import {
  adminLocationListQuerySchema,
  adminLocationListResponseSchema,
  adminStaffListQuerySchema,
  adminStaffListResponseSchema,
  adminUserListQuerySchema,
  adminUserListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AdminLocationQueryService } from "./admin-location-query.service.js";
import type { AdminUserQueryService } from "./admin-user-query.service.js";

type AdminDirectoryRouteDependencies = {
  adminLocationQueryService: Pick<AdminLocationQueryService, "listLocations">;
  adminUserQueryService: Pick<AdminUserQueryService, "listStaff" | "listUsers">;
};

const adminUserListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "users.view" },
  method: "GET",
  url: "/api/admin/users",
};

const adminLocationListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.view" },
  method: "GET",
  url: "/api/admin/locations",
};

const adminStaffListRoute: RouteDefinition = {
  access: { kind: "permission", permission: "users.view" },
  method: "GET",
  url: "/api/admin/staff",
};

export function registerAdminDirectoryRoutes(
  server: FastifyInstance,
  dependencies: AdminDirectoryRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: adminUserListRoute.access },
    method: adminUserListRoute.method,
    url: adminUserListRoute.url,
    async handler(request) {
      const query = adminUserListQuerySchema.parse(request.query);
      const result = await dependencies.adminUserQueryService.listUsers(query);

      return adminUserListResponseSchema.parse({
        availableRoles: result.availableRoles,
        items: result.items,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });

  server.route({
    config: { access: adminStaffListRoute.access },
    method: adminStaffListRoute.method,
    url: adminStaffListRoute.url,
    async handler(request) {
      const query = adminStaffListQuerySchema.parse(request.query);
      const result = await dependencies.adminUserQueryService.listStaff(query);

      return adminStaffListResponseSchema.parse({
        items: result.items,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });

  server.route({
    config: { access: adminLocationListRoute.access },
    method: adminLocationListRoute.method,
    url: adminLocationListRoute.url,
    async handler(request) {
      const query = adminLocationListQuerySchema.parse(request.query);
      const result =
        await dependencies.adminLocationQueryService.listLocations(query);

      return adminLocationListResponseSchema.parse({
        items: result.items,
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
      });
    },
  });
}

function createUnavailableDependencies(): AdminDirectoryRouteDependencies {
  return {
    adminLocationQueryService: {
      async listLocations() {
        throw unavailableAdminDirectoryError();
      },
    },
    adminUserQueryService: {
      async listStaff() {
        throw unavailableAdminDirectoryError();
      },
      async listUsers() {
        throw unavailableAdminDirectoryError();
      },
    },
  };
}

function unavailableAdminDirectoryError() {
  return new AppError({
    code: "internal_error",
    detail: "Admin directory services are not configured for this environment.",
    statusCode: 503,
    title: "Admin directory unavailable",
  });
}
