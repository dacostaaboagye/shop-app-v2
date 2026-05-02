import { changeLogPageQuerySchema, changeLogPageSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { CatalogChangeLogReadService } from "../catalog-change-log/catalog-change-log-read.service.js";
import { InvalidChangeLogCursorError } from "../catalog-change-log/catalog-change-log-read.service.js";
import type {
  CatalogHistoryEntityKind,
  CatalogHistoryEntityLookup,
} from "./catalog-history-entity-lookup.js";

export type CatalogHistoryRouteDependencies = {
  changeLogReadService: Pick<
    CatalogChangeLogReadService,
    "readByEntity" | "readByParentMerged"
  >;
  entityLookup: CatalogHistoryEntityLookup;
};

const productHistoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.history.view" },
  method: "GET",
  url: "/api/admin/catalog/products/:slug/changes",
};

const variantHistoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.history.view" },
  method: "GET",
  url: "/api/admin/catalog/variants/:slug/changes",
};

const brandHistoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.history.view" },
  method: "GET",
  url: "/api/admin/catalog/brands/:slug/changes",
};

const categoryHistoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.history.view" },
  method: "GET",
  url: "/api/admin/catalog/categories/:slug/changes",
};

export function registerCatalogAdminHistoryRoutes(
  server: FastifyInstance,
  dependencies: CatalogHistoryRouteDependencies = createUnavailableDependencies(),
) {
  registerHistoryRoute(server, dependencies, productHistoryRoute, {
    kind: "catalog_product",
    notFoundTitle: "Product not found",
    notFoundDetail: (slug) => `Product "${slug}" does not exist.`,
    merged: true,
  });
  registerHistoryRoute(server, dependencies, variantHistoryRoute, {
    kind: "product_variant",
    notFoundTitle: "Variant not found",
    notFoundDetail: (slug) => `Variant "${slug}" does not exist.`,
    merged: false,
  });
  registerHistoryRoute(server, dependencies, brandHistoryRoute, {
    kind: "catalog_brand",
    notFoundTitle: "Brand not found",
    notFoundDetail: (slug) => `Brand "${slug}" does not exist.`,
    merged: false,
  });
  registerHistoryRoute(server, dependencies, categoryHistoryRoute, {
    kind: "catalog_category",
    notFoundTitle: "Category not found",
    notFoundDetail: (slug) => `Category "${slug}" does not exist.`,
    merged: false,
  });
}

type RouteOptions = {
  kind: CatalogHistoryEntityKind;
  notFoundTitle: string;
  notFoundDetail: (slug: string) => string;
  // Product history merges parent + child rows so variant/option events
  // appear on the parent's stream. Variants, brands, and categories have
  // no children in the change-log model and use the entity-only read.
  merged: boolean;
};

function registerHistoryRoute(
  server: FastifyInstance,
  dependencies: CatalogHistoryRouteDependencies,
  route: RouteDefinition,
  options: RouteOptions,
) {
  server.route({
    config: { access: route.access },
    method: route.method,
    url: route.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const query = changeLogPageQuerySchema.parse(request.query);
      const entityId = await dependencies.entityLookup.findIdBySlug({
        kind: options.kind,
        slug,
      });
      if (!entityId) {
        throw new AppError({
          code: "not_found",
          detail: options.notFoundDetail(slug),
          statusCode: 404,
          title: options.notFoundTitle,
        });
      }
      const page = await readPage(
        dependencies.changeLogReadService,
        options,
        entityId,
        query,
      );
      return changeLogPageSchema.parse(page);
    },
  });
}

async function readPage(
  service: CatalogHistoryRouteDependencies["changeLogReadService"],
  options: RouteOptions,
  entityId: string,
  query: { cursor?: string | undefined; limit: number },
) {
  try {
    if (options.merged) {
      return await service.readByParentMerged({
        parentEntityType: options.kind,
        parentEntityId: entityId,
        cursor: query.cursor ?? null,
        limit: query.limit,
      });
    }
    return await service.readByEntity({
      entityType: options.kind,
      entityId: entityId,
      cursor: query.cursor ?? null,
      limit: query.limit,
    });
  } catch (error) {
    if (error instanceof InvalidChangeLogCursorError) {
      throw new AppError({
        code: "validation_error",
        detail: "The supplied pagination cursor is not valid.",
        statusCode: 400,
        title: "Invalid cursor",
      });
    }
    throw error;
  }
}

function createUnavailableDependencies(): CatalogHistoryRouteDependencies {
  return {
    changeLogReadService: {
      async readByEntity() {
        throw unavailableError();
      },
      async readByParentMerged() {
        throw unavailableError();
      },
    },
    entityLookup: {
      async findIdBySlug() {
        throw unavailableError();
      },
    },
  };
}

function unavailableError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Catalog history services are not configured for this environment.",
    statusCode: 503,
    title: "Catalog history unavailable",
  });
}
