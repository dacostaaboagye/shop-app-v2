import {
  adminMediaConfirmRequestSchema,
  adminMediaListResponseSchema,
  adminMediaPresignRequestSchema,
  adminMediaPresignResponseSchema,
  adminMediaRecordSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AccountProfileMediaService } from "./account-profile-media.service.js";
import { getAuthenticatedUserId } from "./auth-route-support.js";

type AccountProfileMediaRouteDependencies = {
  accountProfileMediaService: Pick<
    AccountProfileMediaService,
    "confirm" | "delete" | "list" | "presign" | "setPrimary"
  >;
};

const listRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/auth/me/media",
};

const presignRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "POST",
  url: "/api/auth/me/media/presign",
};

const confirmRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "POST",
  url: "/api/auth/me/media/confirm",
};

const setPrimaryRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "POST",
  url: "/api/auth/me/media/:id/set-primary",
};

const deleteRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "DELETE",
  url: "/api/auth/me/media/:id",
};

export function registerAccountProfileMediaRoutes(
  server: FastifyInstance,
  dependencies: AccountProfileMediaRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: listRoute.access },
    method: listRoute.method,
    url: listRoute.url,
    async handler(request) {
      const result = await dependencies.accountProfileMediaService.list(
        getAuthenticatedUserId(request),
      );

      return adminMediaListResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: presignRoute.access },
    method: presignRoute.method,
    url: presignRoute.url,
    async handler(request) {
      const body = adminMediaPresignRequestSchema
        .omit({ entitySlug: true, entityType: true })
        .parse(request.body);
      const result = await dependencies.accountProfileMediaService.presign(
        getAuthenticatedUserId(request),
        body,
      );

      return adminMediaPresignResponseSchema.parse({
        ...result,
        expiresAt: result.expiresAt.toISOString(),
      });
    },
  });

  server.route({
    config: { access: confirmRoute.access },
    method: confirmRoute.method,
    url: confirmRoute.url,
    async handler(request) {
      const body = adminMediaConfirmRequestSchema
        .omit({
          entitySlug: true,
          entityType: true,
          position: true,
          isPrimary: true,
        })
        .parse(request.body);
      const result = await dependencies.accountProfileMediaService.confirm(
        getAuthenticatedUserId(request),
        {
          ...("altText" in body ? { altText: body.altText ?? null } : {}),
          ...("fileSizeBytes" in body && body.fileSizeBytes !== undefined
            ? { fileSizeBytes: body.fileSizeBytes }
            : {}),
          ...("heightPx" in body && body.heightPx !== undefined
            ? { heightPx: body.heightPx }
            : {}),
          key: body.key,
          mimeType: body.mimeType,
          ...("widthPx" in body && body.widthPx !== undefined
            ? { widthPx: body.widthPx }
            : {}),
        },
      );

      return adminMediaRecordSchema.parse(result);
    },
  });

  server.route({
    config: { access: setPrimaryRoute.access },
    method: setPrimaryRoute.method,
    url: setPrimaryRoute.url,
    async handler(request) {
      const { id } = request.params as { id: string };
      const result = await dependencies.accountProfileMediaService.setPrimary(
        getAuthenticatedUserId(request),
        id,
      );

      return adminMediaRecordSchema.parse(result);
    },
  });

  server.route({
    config: { access: deleteRoute.access },
    method: deleteRoute.method,
    url: deleteRoute.url,
    async handler(request, reply) {
      const { id } = request.params as { id: string };
      await dependencies.accountProfileMediaService.delete(
        getAuthenticatedUserId(request),
        id,
      );

      return reply.status(204).send();
    },
  });
}

function createUnavailableDependencies(): AccountProfileMediaRouteDependencies {
  const unavailable = async (): Promise<never> => {
    throw new AppError({
      code: "internal_error",
      detail: "Account profile media services are not configured.",
      statusCode: 503,
      title: "Profile media unavailable",
    });
  };

  return {
    accountProfileMediaService: {
      async confirm() {
        return unavailable();
      },
      async delete() {
        return unavailable();
      },
      async list() {
        return unavailable();
      },
      async presign() {
        return unavailable();
      },
      async setPrimary() {
        return unavailable();
      },
    },
  };
}
