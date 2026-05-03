import {
  catalogReferenceImportResponseSchema,
  catalogReferenceImportTemplateResponseSchema,
  catalogReferenceImportUploadRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { CatalogReferenceImportService } from "./catalog-reference-import.service.js";

export type CatalogReferenceImportRouteDependencies = {
  catalogReferenceImportService: Pick<
    CatalogReferenceImportService,
    "getTemplate" | "importBrands" | "importCategories"
  >;
};

const routes = {
  brandTemplate: {
    access: { kind: "permission", permission: "catalog.brands.manage" },
    method: "GET",
    url: "/api/admin/catalog/brands/imports/template",
  } satisfies RouteDefinition,
  brandUpload: {
    access: { kind: "permission", permission: "catalog.brands.manage" },
    method: "POST",
    url: "/api/admin/catalog/brands/imports",
  } satisfies RouteDefinition,
  categoryTemplate: {
    access: { kind: "permission", permission: "catalog.categories.manage" },
    method: "GET",
    url: "/api/admin/catalog/categories/imports/template",
  } satisfies RouteDefinition,
  categoryUpload: {
    access: { kind: "permission", permission: "catalog.categories.manage" },
    method: "POST",
    url: "/api/admin/catalog/categories/imports",
  } satisfies RouteDefinition,
};

export function registerCatalogReferenceImportRoutes(
  server: FastifyInstance,
  dependencies: CatalogReferenceImportRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: routes.brandTemplate.access },
    method: routes.brandTemplate.method,
    url: routes.brandTemplate.url,
    async handler() {
      return catalogReferenceImportTemplateResponseSchema.parse(
        dependencies.catalogReferenceImportService.getTemplate("brand"),
      );
    },
  });

  server.route({
    config: { access: routes.categoryTemplate.access },
    method: routes.categoryTemplate.method,
    url: routes.categoryTemplate.url,
    async handler() {
      return catalogReferenceImportTemplateResponseSchema.parse(
        dependencies.catalogReferenceImportService.getTemplate("category"),
      );
    },
  });

  server.route({
    config: { access: routes.brandUpload.access },
    method: routes.brandUpload.method,
    url: routes.brandUpload.url,
    async handler(request) {
      const payload = catalogReferenceImportUploadRequestSchema.parse(
        request.body,
      );
      const result =
        await dependencies.catalogReferenceImportService.importBrands({
          actor: getAuthenticatedActor(request),
          csv: payload.csv,
          fileName: payload.fileName,
          now: new Date(),
        });
      return catalogReferenceImportResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: routes.categoryUpload.access },
    method: routes.categoryUpload.method,
    url: routes.categoryUpload.url,
    async handler(request) {
      const payload = catalogReferenceImportUploadRequestSchema.parse(
        request.body,
      );
      const result =
        await dependencies.catalogReferenceImportService.importCategories({
          actor: getAuthenticatedActor(request),
          csv: payload.csv,
          fileName: payload.fileName,
          now: new Date(),
        });
      return catalogReferenceImportResponseSchema.parse(result);
    },
  });
}

function createUnavailableDependencies(): CatalogReferenceImportRouteDependencies {
  return {
    catalogReferenceImportService: {
      getTemplate() {
        throw unavailableCatalogReferenceImportError();
      },
      async importBrands() {
        throw unavailableCatalogReferenceImportError();
      },
      async importCategories() {
        throw unavailableCatalogReferenceImportError();
      },
    },
  };
}

function unavailableCatalogReferenceImportError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Catalog reference import services are not configured.",
    statusCode: 503,
    title: "Catalog reference import unavailable",
  });
}
