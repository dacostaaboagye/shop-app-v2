import { adminUserAccessDetailSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import {
  type AdminUserAccessRouteDependencies,
  adminUserAccessRoutes,
  adminUserAccessSchemas,
  createUnavailableDependencies,
  userNotFoundError,
} from "./admin-user-access-route-support.js";

export function registerAdminUserAccessRoutes(
  server: FastifyInstance,
  dependencies: AdminUserAccessRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: adminUserAccessRoutes.detail.access },
    method: adminUserAccessRoutes.detail.method,
    url: adminUserAccessRoutes.detail.url,
    async handler(request) {
      const detail =
        await dependencies.adminUserAccessQueryService.getUserAccessDetail(
          (request.params as { slug: string }).slug,
        );

      if (!detail) {
        throw userNotFoundError();
      }

      return adminUserAccessDetailSchema.parse(detail);
    },
  });

  server.route({
    config: { access: adminUserAccessRoutes.assignRole.access },
    method: adminUserAccessRoutes.assignRole.method,
    url: adminUserAccessRoutes.assignRole.url,
    async handler(request, reply) {
      await dependencies.adminUserAccessWriteService.assignRole(
        getAuthenticatedActor(request),
        (request.params as { slug: string }).slug,
        adminUserAccessSchemas.assignRole.parse(request.body),
        new Date(),
      );
      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: adminUserAccessRoutes.revokeRole.access },
    method: adminUserAccessRoutes.revokeRole.method,
    url: adminUserAccessRoutes.revokeRole.url,
    async handler(request, reply) {
      const params = request.params as { roleSlug: string; slug: string };

      await dependencies.adminUserAccessWriteService.revokeRole(
        getAuthenticatedActor(request),
        params.slug,
        params.roleSlug,
        adminUserAccessSchemas.revokeRole.parse(request.body),
        new Date(),
      );
      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: adminUserAccessRoutes.setOverride.access },
    method: adminUserAccessRoutes.setOverride.method,
    url: adminUserAccessRoutes.setOverride.url,
    async handler(request, reply) {
      await dependencies.adminUserAccessWriteService.setPermissionOverride(
        getAuthenticatedActor(request),
        (request.params as { slug: string }).slug,
        adminUserAccessSchemas.setOverride.parse(request.body),
        new Date(),
      );
      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: adminUserAccessRoutes.removeOverride.access },
    method: adminUserAccessRoutes.removeOverride.method,
    url: adminUserAccessRoutes.removeOverride.url,
    async handler(request, reply) {
      const params = request.params as { permissionKey: string; slug: string };

      await dependencies.adminUserAccessWriteService.removePermissionOverride(
        getAuthenticatedActor(request),
        params.slug,
        params.permissionKey,
        adminUserAccessSchemas.removeOverride.parse(request.body),
        new Date(),
      );
      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: adminUserAccessRoutes.updateProfile.access },
    method: adminUserAccessRoutes.updateProfile.method,
    url: adminUserAccessRoutes.updateProfile.url,
    async handler(request, reply) {
      await dependencies.adminUserAccessWriteService.updateProfile(
        getAuthenticatedActor(request),
        (request.params as { slug: string }).slug,
        adminUserAccessSchemas.updateProfile.parse(request.body),
      );
      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: adminUserAccessRoutes.updateStatus.access },
    method: adminUserAccessRoutes.updateStatus.method,
    url: adminUserAccessRoutes.updateStatus.url,
    async handler(request, reply) {
      await dependencies.adminUserAccessWriteService.updateStatus(
        getAuthenticatedActor(request),
        (request.params as { slug: string }).slug,
        adminUserAccessSchemas.updateStatus.parse(request.body),
        new Date(),
      );
      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: adminUserAccessRoutes.forcePasswordReset.access },
    method: adminUserAccessRoutes.forcePasswordReset.method,
    url: adminUserAccessRoutes.forcePasswordReset.url,
    async handler(request, reply) {
      await dependencies.adminUserAccessWriteService.forcePasswordReset(
        getAuthenticatedActor(request),
        (request.params as { slug: string }).slug,
        adminUserAccessSchemas.forcePasswordReset.parse(request.body),
        new Date(),
      );
      return reply.status(204).send();
    },
  });
}
