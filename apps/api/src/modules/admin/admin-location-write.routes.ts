import {
  adminCreateLocationRequestSchema,
  adminCreateLocationResponseSchema,
  adminCreateLocationZoneRequestSchema,
  adminCreateLocationZoneResponseSchema,
  adminUpdateLocationRequestSchema,
  adminUpdateLocationResponseSchema,
  adminUpdateLocationZoneRequestSchema,
  adminUpdateLocationZoneResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { AdminLocationWriteService } from "./admin-location-write.service.js";

type AdminLocationWriteRouteDependencies = {
  adminLocationWriteService: Pick<
    AdminLocationWriteService,
    | "createLocation"
    | "updateLocation"
    | "createLocationZone"
    | "updateLocationZone"
    | "deleteLocationZone"
  >;
};

const createLocationRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.create" },
  method: "POST",
  url: "/api/admin/locations",
};

const updateLocationRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.create" },
  method: "PATCH",
  url: "/api/admin/locations/:slug",
};

const createLocationZoneRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.create" },
  method: "POST",
  url: "/api/admin/locations/:slug/zones",
};

const updateLocationZoneRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.create" },
  method: "PATCH",
  url: "/api/admin/locations/:slug/zones/:zoneSlug",
};

const deleteLocationZoneRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.create" },
  method: "DELETE",
  url: "/api/admin/locations/:slug/zones/:zoneSlug",
};

export function registerAdminLocationWriteRoutes(
  server: FastifyInstance,
  dependencies: AdminLocationWriteRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: createLocationRoute.access },
    method: createLocationRoute.method,
    url: createLocationRoute.url,
    async handler(request) {
      const payload = adminCreateLocationRequestSchema.parse(request.body);
      return adminCreateLocationResponseSchema.parse(
        await dependencies.adminLocationWriteService.createLocation(
          getAuthenticatedUserId(request),
          payload,
          new Date(),
        ),
      );
    },
  });

  server.route({
    config: { access: updateLocationRoute.access },
    method: updateLocationRoute.method,
    url: updateLocationRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const payload = adminUpdateLocationRequestSchema.parse(request.body);
      const result =
        await dependencies.adminLocationWriteService.updateLocation(
          getAuthenticatedUserId(request),
          slug,
          payload,
          new Date(),
        );

      if (!result) {
        throw new AppError({
          code: "not_found",
          detail: `Location "${slug}" does not exist.`,
          statusCode: 404,
          title: "Location not found",
        });
      }

      return adminUpdateLocationResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: createLocationZoneRoute.access },
    method: createLocationZoneRoute.method,
    url: createLocationZoneRoute.url,
    async handler(request) {
      const { slug: locationSlug } = request.params as { slug: string };
      const payload = adminCreateLocationZoneRequestSchema.parse(request.body);
      return adminCreateLocationZoneResponseSchema.parse(
        await dependencies.adminLocationWriteService.createLocationZone(
          getAuthenticatedUserId(request),
          locationSlug,
          payload,
          new Date(),
        ),
      );
    },
  });

  server.route({
    config: { access: updateLocationZoneRoute.access },
    method: updateLocationZoneRoute.method,
    url: updateLocationZoneRoute.url,
    async handler(request) {
      const { slug: locationSlug, zoneSlug } = request.params as {
        slug: string;
        zoneSlug: string;
      };
      const payload = adminUpdateLocationZoneRequestSchema.parse(request.body);
      const result =
        await dependencies.adminLocationWriteService.updateLocationZone(
          getAuthenticatedUserId(request),
          locationSlug,
          zoneSlug,
          payload,
          new Date(),
        );

      if (!result) {
        throw new AppError({
          code: "not_found",
          detail: `Zone "${zoneSlug}" does not exist in location "${locationSlug}".`,
          statusCode: 404,
          title: "Zone not found",
        });
      }

      return adminUpdateLocationZoneResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: deleteLocationZoneRoute.access },
    method: deleteLocationZoneRoute.method,
    url: deleteLocationZoneRoute.url,
    async handler(request, reply) {
      const { slug: locationSlug, zoneSlug } = request.params as {
        slug: string;
        zoneSlug: string;
      };
      const result =
        await dependencies.adminLocationWriteService.deleteLocationZone(
          getAuthenticatedUserId(request),
          locationSlug,
          zoneSlug,
        );

      if (!result) {
        throw new AppError({
          code: "not_found",
          detail: `Zone "${zoneSlug}" never existed or was already deleted.`,
          statusCode: 404,
          title: "Zone not found",
        });
      }

      return reply.code(204).send();
    },
  });
}

function createUnavailableDependencies(): AdminLocationWriteRouteDependencies {
  return {
    adminLocationWriteService: {
      async createLocation() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Admin location write services are not configured for this environment.",
          statusCode: 503,
          title: "Admin location writes unavailable",
        });
      },
      async updateLocation() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Admin location write services are not configured for this environment.",
          statusCode: 503,
          title: "Admin location writes unavailable",
        });
      },
      async createLocationZone() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Admin location write services are not configured for this environment.",
          statusCode: 503,
          title: "Admin location writes unavailable",
        });
      },
      async updateLocationZone() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Admin location write services are not configured for this environment.",
          statusCode: 503,
          title: "Admin location writes unavailable",
        });
      },
      async deleteLocationZone() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Admin location write services are not configured for this environment.",
          statusCode: 503,
          title: "Admin location writes unavailable",
        });
      },
    },
  };
}
