import {
  adminOpeningVariantSearchQuerySchema,
  variantSearchQuerySchema,
  variantSearchResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PostgresVariantSearchRepository } from "./postgres-variant-search.repository.js";

type CatalogManagerQueryDependencies = {
  variantSearchRepository: Pick<
    PostgresVariantSearchRepository,
    | "searchOpeningVariants"
    | "searchOpeningVariantsByLocationSlug"
    | "searchVariants"
  >;
};

const searchVariantsRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "stock.assignments.manage",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/manager/catalog/variants",
};

const searchAdminOpeningVariantsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "inventory.write" },
  method: "GET",
  url: "/api/admin/catalog/variants/opening",
};

const searchManagerOpeningVariantsRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "inventory.write",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/manager/catalog/variants/opening",
};

export function registerCatalogManagerQueryRoutes(
  server: FastifyInstance,
  dependencies: CatalogManagerQueryDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: searchVariantsRoute.access },
    method: searchVariantsRoute.method,
    url: searchVariantsRoute.url,
    async handler(request) {
      const query = variantSearchQuerySchema.parse(request.query);
      const result = await dependencies.variantSearchRepository.searchVariants({
        locationId: query.locationId,
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
      });
      return variantSearchResponseSchema.parse({
        items: result.items,
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });

  server.route({
    config: { access: searchAdminOpeningVariantsRoute.access },
    method: searchAdminOpeningVariantsRoute.method,
    url: searchAdminOpeningVariantsRoute.url,
    async handler(request) {
      const query = adminOpeningVariantSearchQuerySchema.parse(request.query);
      const result =
        await dependencies.variantSearchRepository.searchOpeningVariantsByLocationSlug(
          {
            locationSlug: query.locationSlug,
            page: query.page,
            pageSize: query.pageSize,
            q: query.q,
          },
        );
      return variantSearchResponseSchema.parse({
        items: result.items,
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });

  server.route({
    config: { access: searchManagerOpeningVariantsRoute.access },
    method: searchManagerOpeningVariantsRoute.method,
    url: searchManagerOpeningVariantsRoute.url,
    async handler(request) {
      const query = variantSearchQuerySchema.parse(request.query);
      const result =
        await dependencies.variantSearchRepository.searchOpeningVariants({
          locationId: query.locationId,
          page: query.page,
          pageSize: query.pageSize,
          q: query.q,
        });
      return variantSearchResponseSchema.parse({
        items: result.items,
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });
}

function createUnavailableDependencies(): CatalogManagerQueryDependencies {
  return {
    variantSearchRepository: {
      async searchOpeningVariants() {
        throw new (await import("../_core/errors/app-error.js")).AppError({
          code: "internal_error",
          detail: "Catalog services are not configured for this environment.",
          statusCode: 503,
          title: "Catalog unavailable",
        });
      },
      async searchOpeningVariantsByLocationSlug() {
        throw new (await import("../_core/errors/app-error.js")).AppError({
          code: "internal_error",
          detail: "Catalog services are not configured for this environment.",
          statusCode: 503,
          title: "Catalog unavailable",
        });
      },
      async searchVariants() {
        throw new (await import("../_core/errors/app-error.js")).AppError({
          code: "internal_error",
          detail: "Catalog services are not configured for this environment.",
          statusCode: 503,
          title: "Catalog unavailable",
        });
      },
    },
  };
}
