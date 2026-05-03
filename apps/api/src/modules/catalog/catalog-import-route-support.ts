import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { CatalogImportService } from "./catalog-import.service.js";

export type CatalogImportRouteDependencies = {
  catalogImportService: Pick<
    CatalogImportService,
    "getJob" | "getReport" | "startImport"
  >;
};

export const catalogImportRoutes = {
  report: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "GET",
    url: "/api/admin/catalog/imports/:reference/report",
  } satisfies RouteDefinition,
  show: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "GET",
    url: "/api/admin/catalog/imports/:reference",
  } satisfies RouteDefinition,
  start: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "POST",
    url: "/api/admin/catalog/imports",
  } satisfies RouteDefinition,
  template: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "GET",
    url: "/api/admin/catalog/imports/template",
  } satisfies RouteDefinition,
};

export function createUnavailableCatalogImportDependencies(): CatalogImportRouteDependencies {
  return {
    catalogImportService: {
      async getJob() {
        throw unavailableCatalogImportError();
      },
      async getReport() {
        throw unavailableCatalogImportError();
      },
      async startImport() {
        throw unavailableCatalogImportError();
      },
    },
  };
}

function unavailableCatalogImportError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Catalog import services are not configured for this environment.",
    statusCode: 503,
    title: "Catalog import unavailable",
  });
}
