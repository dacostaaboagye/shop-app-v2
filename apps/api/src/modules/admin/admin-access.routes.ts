import {
  adminAuditListQuerySchema,
  adminAuditListResponseSchema,
  adminCreateRoleRequestSchema,
  adminPermissionListQuerySchema,
  adminPermissionListResponseSchema,
  adminRoleDetailSchema,
  adminRoleListQuerySchema,
  adminRoleListResponseSchema,
  adminUpdateRoleRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { AdminAccessQueryService } from "./admin-access-query.service.js";
import type { AdminAccessWriteService } from "./admin-access-write.service.js";

type AdminAccessRouteDependencies = {
  adminAccessQueryService: Pick<
    AdminAccessQueryService,
    "getRole" | "listAudit" | "listPermissions" | "listRoles"
  >;
  adminAccessWriteService: Pick<
    AdminAccessWriteService,
    "createRole" | "updateRole"
  >;
};

const routes = {
  audit: {
    access: { kind: "permission", permission: "access.audit.view" },
    method: "GET",
    url: "/api/admin/access/audit",
  } satisfies RouteDefinition,
  permissions: {
    access: { kind: "permission", permission: "access.permissions.view" },
    method: "GET",
    url: "/api/admin/access/permissions",
  } satisfies RouteDefinition,
  roleCreate: {
    access: { kind: "permission", permission: "access.roles.manage" },
    method: "POST",
    url: "/api/admin/access/roles",
  } satisfies RouteDefinition,
  roleDetail: {
    access: { kind: "permission", permission: "access.roles.view" },
    method: "GET",
    url: "/api/admin/access/roles/:slug",
  } satisfies RouteDefinition,
  roleList: {
    access: { kind: "permission", permission: "access.roles.view" },
    method: "GET",
    url: "/api/admin/access/roles",
  } satisfies RouteDefinition,
  roleUpdate: {
    access: { kind: "permission", permission: "access.roles.manage" },
    method: "PATCH",
    url: "/api/admin/access/roles/:slug",
  } satisfies RouteDefinition,
};

export function registerAdminAccessRoutes(
  server: FastifyInstance,
  dependencies: AdminAccessRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: routes.roleList.access },
    method: routes.roleList.method,
    url: routes.roleList.url,
    async handler(request) {
      const query = adminRoleListQuerySchema.parse(request.query);
      return adminRoleListResponseSchema.parse(
        await dependencies.adminAccessQueryService.listRoles(query),
      );
    },
  });

  server.route({
    config: { access: routes.roleDetail.access },
    method: routes.roleDetail.method,
    url: routes.roleDetail.url,
    async handler(request) {
      const role = await dependencies.adminAccessQueryService.getRole(
        (request.params as { slug: string }).slug,
      );

      if (!role) {
        throw new AppError({
          code: "not_found",
          detail: "The requested role could not be found.",
          statusCode: 404,
          title: "Role not found",
        });
      }

      return adminRoleDetailSchema.parse(role);
    },
  });

  server.route({
    config: { access: routes.roleCreate.access },
    method: routes.roleCreate.method,
    url: routes.roleCreate.url,
    async handler(request) {
      const payload = adminCreateRoleRequestSchema.parse(request.body);
      const actorId = getAuthenticatedUserId(request);
      return adminRoleDetailSchema.parse(
        await dependencies.adminAccessWriteService.createRole(
          actorId,
          payload,
          new Date(),
        ),
      );
    },
  });

  server.route({
    config: { access: routes.roleUpdate.access },
    method: routes.roleUpdate.method,
    url: routes.roleUpdate.url,
    async handler(request) {
      const payload = adminUpdateRoleRequestSchema.parse(request.body);
      const actorId = getAuthenticatedUserId(request);
      return adminRoleDetailSchema.parse(
        await dependencies.adminAccessWriteService.updateRole(
          actorId,
          (request.params as { slug: string }).slug,
          payload,
          new Date(),
        ),
      );
    },
  });

  server.route({
    config: { access: routes.permissions.access },
    method: routes.permissions.method,
    url: routes.permissions.url,
    async handler(request) {
      const query = adminPermissionListQuerySchema.parse(request.query);
      return adminPermissionListResponseSchema.parse(
        await dependencies.adminAccessQueryService.listPermissions(query),
      );
    },
  });

  server.route({
    config: { access: routes.audit.access },
    method: routes.audit.method,
    url: routes.audit.url,
    async handler(request) {
      const query = adminAuditListQuerySchema.parse(request.query);
      return adminAuditListResponseSchema.parse(
        await dependencies.adminAccessQueryService.listAudit(query),
      );
    },
  });
}

function createUnavailableDependencies(): AdminAccessRouteDependencies {
  return {
    adminAccessQueryService: {
      async getRole() {
        throw unavailableAdminAccessError();
      },
      async listAudit() {
        throw unavailableAdminAccessError();
      },
      async listPermissions() {
        throw unavailableAdminAccessError();
      },
      async listRoles() {
        throw unavailableAdminAccessError();
      },
    },
    adminAccessWriteService: {
      async createRole() {
        throw unavailableAdminAccessError();
      },
      async updateRole() {
        throw unavailableAdminAccessError();
      },
    },
  };
}

function unavailableAdminAccessError() {
  return new AppError({
    code: "internal_error",
    detail:
      "Admin access-control services are not configured for this environment.",
    statusCode: 503,
    title: "Admin access unavailable",
  });
}
