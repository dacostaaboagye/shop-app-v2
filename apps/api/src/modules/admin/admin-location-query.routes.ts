import { adminLocationStaffListResponseSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AdminLocationQueryService } from "./admin-location-query.service.js";

type AdminLocationQueryRouteDependencies = {
  adminLocationQueryService: Pick<
    AdminLocationQueryService,
    "getLocation" | "listLocationStaff" | "listLocationZones"
  >;
};

const getLocationRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.view" },
  method: "GET",
  url: "/api/admin/locations/:slug",
};

const listLocationZonesRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.view" },
  method: "GET",
  url: "/api/admin/locations/:slug/zones",
};

const listLocationStaffRoute: RouteDefinition = {
  access: { kind: "permission", permission: "locations.view" },
  method: "GET",
  url: "/api/admin/locations/:slug/staff",
};

export function registerAdminLocationQueryRoutes(
  server: FastifyInstance,
  dependencies: AdminLocationQueryRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: getLocationRoute.access },
    method: getLocationRoute.method,
    url: getLocationRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const location =
        await dependencies.adminLocationQueryService.getLocation(slug);

      if (!location) {
        throw new AppError({
          code: "not_found",
          detail: `Location "${slug}" does not exist.`,
          statusCode: 404,
          title: "Location not found",
        });
      }

      return location;
    },
  });

  server.route({
    config: { access: listLocationZonesRoute.access },
    method: listLocationZonesRoute.method,
    url: listLocationZonesRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const items =
        await dependencies.adminLocationQueryService.listLocationZones(slug);
      return { items };
    },
  });

  server.route({
    config: { access: listLocationStaffRoute.access },
    method: listLocationStaffRoute.method,
    url: listLocationStaffRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const result =
        await dependencies.adminLocationQueryService.listLocationStaff(slug);

      if (!result.locationName) {
        throw new AppError({
          code: "not_found",
          detail: `Location "${slug}" does not exist.`,
          statusCode: 404,
          title: "Location not found",
        });
      }

      return adminLocationStaffListResponseSchema.parse({
        items: result.items,
        locationName: result.locationName,
        locationSlug: result.locationSlug,
      });
    },
  });
}

function createUnavailableDependencies(): AdminLocationQueryRouteDependencies {
  return {
    adminLocationQueryService: {
      async getLocation() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Admin location query services are not configured for this environment.",
          statusCode: 503,
          title: "Admin location queries unavailable",
        });
      },
      async listLocationZones() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Admin location query services are not configured for this environment.",
          statusCode: 503,
          title: "Admin location queries unavailable",
        });
      },
      async listLocationStaff() {
        throw new AppError({
          code: "internal_error",
          detail:
            "Admin location query services are not configured for this environment.",
          statusCode: 503,
          title: "Admin location queries unavailable",
        });
      },
    },
  };
}
