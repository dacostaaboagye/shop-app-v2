import {
  adminMediaConfirmRequestSchema,
  adminMediaListResponseSchema,
  adminMediaPresignRequestSchema,
  adminMediaPresignResponseSchema,
  adminMediaRecordSchema,
  adminMediaSetPrimaryRequestSchema,
  adminMediaUpdateRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { CatalogMediaService } from "./catalog-media.service.js";

type Deps = { catalogMediaService: CatalogMediaService };

const MANAGE = "catalog.media.manage";
const VIEW = "catalog.view";

const routes = {
  confirm: {
    access: { kind: "permission", permission: MANAGE },
    method: "POST",
    url: "/api/admin/catalog/media/confirm",
  } satisfies RouteDefinition,
  delete: {
    access: { kind: "permission", permission: MANAGE },
    method: "DELETE",
    url: "/api/admin/catalog/media/:id",
  } satisfies RouteDefinition,
  list: {
    access: { kind: "permission", permission: VIEW },
    method: "GET",
    url: "/api/admin/catalog/media",
  } satisfies RouteDefinition,
  presign: {
    access: { kind: "permission", permission: MANAGE },
    method: "POST",
    url: "/api/admin/catalog/media/presign",
  } satisfies RouteDefinition,
  setPrimary: {
    access: { kind: "permission", permission: MANAGE },
    method: "POST",
    url: "/api/admin/catalog/media/:id/set-primary",
  } satisfies RouteDefinition,
  update: {
    access: { kind: "permission", permission: MANAGE },
    method: "PATCH",
    url: "/api/admin/catalog/media/:id",
  } satisfies RouteDefinition,
};

export function registerCatalogMediaRoutes(
  server: FastifyInstance,
  deps: Deps = createUnavailableDeps(),
) {
  server.route({
    config: { access: routes.presign.access },
    method: routes.presign.method,
    url: routes.presign.url,
    async handler(request) {
      const body = adminMediaPresignRequestSchema.parse(request.body);
      const result = await deps.catalogMediaService.presign({
        actorId: getAuthenticatedUserId(request),
        ...body,
      });
      return adminMediaPresignResponseSchema.parse({
        ...result,
        expiresAt: result.expiresAt.toISOString(),
      });
    },
  });

  server.route({
    config: { access: routes.confirm.access },
    method: routes.confirm.method,
    url: routes.confirm.url,
    async handler(request) {
      const body = adminMediaConfirmRequestSchema.parse(request.body);
      const result = await deps.catalogMediaService.confirm(
        getAuthenticatedUserId(request),
        body,
      );
      return adminMediaRecordSchema.parse(result);
    },
  });

  server.route({
    config: { access: routes.list.access },
    method: routes.list.method,
    url: routes.list.url,
    async handler(request) {
      const { entityType, entitySlug } = request.query as {
        entityType: string;
        entitySlug: string;
      };
      const items = await deps.catalogMediaService.listMedia(
        entityType as Parameters<CatalogMediaService["listMedia"]>[0],
        entitySlug,
      );
      return adminMediaListResponseSchema.parse({ items });
    },
  });

  server.route({
    config: { access: routes.update.access },
    method: routes.update.method,
    url: routes.update.url,
    async handler(request) {
      const { id } = request.params as { id: string };
      const patch = adminMediaUpdateRequestSchema.parse(request.body);
      const result = await deps.catalogMediaService.updateMedia(
        id,
        patch,
        new Date(),
      );
      if (!result) throw mediaNotFound(id);
      return adminMediaRecordSchema.parse(result);
    },
  });

  server.route({
    config: { access: routes.delete.access },
    method: routes.delete.method,
    url: routes.delete.url,
    async handler(request, reply) {
      const { id } = request.params as { id: string };
      const deleted = await deps.catalogMediaService.deleteMedia(id);
      if (!deleted) throw mediaNotFound(id);
      return reply.code(204).send();
    },
  });

  server.route({
    config: { access: routes.setPrimary.access },
    method: routes.setPrimary.method,
    url: routes.setPrimary.url,
    async handler(request) {
      const { id } = request.params as { id: string };
      const body = adminMediaSetPrimaryRequestSchema.parse(request.body);
      const result = await deps.catalogMediaService.setPrimary(
        id,
        body.entityType,
        body.entitySlug,
        new Date(),
      );
      if (!result) throw mediaNotFound(id);
      return adminMediaRecordSchema.parse(result);
    },
  });
}

function mediaNotFound(id: string) {
  return new AppError({
    code: "not_found",
    detail: `Media "${id}" does not exist.`,
    statusCode: 404,
    title: "Media not found",
  });
}

function createUnavailableDeps(): Deps {
  const unavailable = async () => {
    throw new AppError({
      code: "internal_error",
      detail: "Catalog media services are not configured.",
      statusCode: 503,
      title: "Media unavailable",
    });
  };
  return {
    catalogMediaService: {
      confirm: unavailable,
      deleteMedia: unavailable,
      listMedia: unavailable,
      presign: unavailable,
      setPrimary: unavailable,
      updateMedia: unavailable,
    } as unknown as CatalogMediaService,
  };
}
