import {
  variantSearchQuerySchema,
  variantSearchResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PostgresVariantSearchRepository } from "./postgres-variant-search.repository.js";

type CatalogManagerQueryDependencies = {
  variantSearchRepository: Pick<
    PostgresVariantSearchRepository,
    "searchVariants"
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
}

function createUnavailableDependencies(): CatalogManagerQueryDependencies {
  return {
    variantSearchRepository: {
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
