import {
  adminBrandListQuerySchema,
  adminBrandListResponseSchema,
  adminBrandSummarySchema,
  adminCreateBrandRequestSchema,
  adminCreateBrandResponseSchema,
  adminUpdateBrandRequestSchema,
  adminUpdateBrandResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { CatalogBrandQueryService } from "./catalog-brand-query.service.js";
import type { CatalogBrandWriteService } from "./catalog-brand-write.service.js";

type CatalogBrandRouteDependencies = {
  catalogBrandQueryService: Pick<
    CatalogBrandQueryService,
    "getBrand" | "listBrands"
  >;
  catalogBrandWriteService: Pick<
    CatalogBrandWriteService,
    "createBrand" | "updateBrand" | "deleteBrand"
  >;
};

const listBrandsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.view" },
  method: "GET",
  url: "/api/admin/catalog/brands",
};

const getBrandRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.view" },
  method: "GET",
  url: "/api/admin/catalog/brands/:slug",
};

const createBrandRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.brands.manage" },
  method: "POST",
  url: "/api/admin/catalog/brands",
};

const updateBrandRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.brands.manage" },
  method: "PATCH",
  url: "/api/admin/catalog/brands/:slug",
};

const deleteBrandRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.brands.manage" },
  method: "DELETE",
  url: "/api/admin/catalog/brands/:slug",
};

export function registerCatalogBrandRoutes(
  server: FastifyInstance,
  dependencies: CatalogBrandRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: listBrandsRoute.access },
    method: listBrandsRoute.method,
    url: listBrandsRoute.url,
    async handler(request) {
      const query = adminBrandListQuerySchema.parse(request.query);
      const response =
        await dependencies.catalogBrandQueryService.listBrands(query);
      return adminBrandListResponseSchema.parse(response);
    },
  });

  server.route({
    config: { access: getBrandRoute.access },
    method: getBrandRoute.method,
    url: getBrandRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const brand = await dependencies.catalogBrandQueryService.getBrand(slug);

      if (!brand) {
        throw new AppError({
          code: "not_found",
          detail: `Brand "${slug}" does not exist.`,
          statusCode: 404,
          title: "Brand not found",
        });
      }

      return adminBrandSummarySchema.parse(brand);
    },
  });

  server.route({
    config: { access: createBrandRoute.access },
    method: createBrandRoute.method,
    url: createBrandRoute.url,
    async handler(request) {
      const payload = adminCreateBrandRequestSchema.parse(request.body);
      const actor = getAuthenticatedActor(request);
      const result = await dependencies.catalogBrandWriteService.createBrand(
        actor,
        payload,
        new Date(),
      );
      return adminCreateBrandResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: updateBrandRoute.access },
    method: updateBrandRoute.method,
    url: updateBrandRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const payload = adminUpdateBrandRequestSchema.parse(request.body);
      const actor = getAuthenticatedActor(request);
      const result = await dependencies.catalogBrandWriteService.updateBrand(
        actor,
        slug,
        payload,
        new Date(),
      );

      if (!result) {
        throw new AppError({
          code: "not_found",
          detail: `Brand "${slug}" does not exist.`,
          statusCode: 404,
          title: "Brand not found",
        });
      }

      return adminUpdateBrandResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: deleteBrandRoute.access },
    method: deleteBrandRoute.method,
    url: deleteBrandRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const actor = getAuthenticatedActor(request);
      await dependencies.catalogBrandWriteService.deleteBrand(
        actor,
        slug,
        new Date(),
      );
      return { success: true };
    },
  });
}

function createUnavailableDependencies(): CatalogBrandRouteDependencies {
  return {
    catalogBrandQueryService: {
      async getBrand() {
        throw unavailableCatalogError();
      },
      async listBrands() {
        throw unavailableCatalogError();
      },
    },
    catalogBrandWriteService: {
      async createBrand() {
        throw unavailableCatalogError();
      },
      async updateBrand() {
        throw unavailableCatalogError();
      },
      async deleteBrand() {
        throw unavailableCatalogError();
      },
    },
  };
}

function unavailableCatalogError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Catalog services are not configured for this environment.",
    statusCode: 503,
    title: "Catalog unavailable",
  });
}
