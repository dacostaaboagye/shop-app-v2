import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { CatalogCategoryWriteService } from "./catalog-category-write.service.js";
import type { CatalogProductWriteService } from "./catalog-product-write.service.js";

export type CatalogWriteRouteDependencies = {
  catalogCategoryWriteService: Pick<
    CatalogCategoryWriteService,
    "createCategory" | "updateCategory" | "deleteCategory"
  >;
  catalogProductWriteService: Pick<
    CatalogProductWriteService,
    | "createProduct"
    | "updateProduct"
    | "deleteProductWithActor"
    | "createVariant"
    | "updateVariant"
    | "deleteVariant"
  >;
};

export const catalogWriteRoutes = {
  createCategory: {
    access: { kind: "permission", permission: "catalog.categories.manage" },
    method: "POST",
    url: "/api/admin/catalog/categories",
  } satisfies RouteDefinition,
  updateCategory: {
    access: { kind: "permission", permission: "catalog.categories.manage" },
    method: "PATCH",
    url: "/api/admin/catalog/categories/:slug",
  } satisfies RouteDefinition,
  deleteCategory: {
    access: { kind: "permission", permission: "catalog.categories.manage" },
    method: "DELETE",
    url: "/api/admin/catalog/categories/:slug",
  } satisfies RouteDefinition,
  createProduct: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "POST",
    url: "/api/admin/catalog/products",
  } satisfies RouteDefinition,
  updateProduct: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "PATCH",
    url: "/api/admin/catalog/products/:slug",
  } satisfies RouteDefinition,
  deleteProduct: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "DELETE",
    url: "/api/admin/catalog/products/:slug",
  } satisfies RouteDefinition,
  createVariant: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "POST",
    url: "/api/admin/catalog/products/:slug/variants",
  } satisfies RouteDefinition,
  updateVariant: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "PATCH",
    url: "/api/admin/catalog/products/:slug/variants/:variantSlug",
  } satisfies RouteDefinition,
  deleteVariant: {
    access: { kind: "permission", permission: "catalog.products.manage" },
    method: "DELETE",
    url: "/api/admin/catalog/products/:slug/variants/:variantSlug",
  } satisfies RouteDefinition,
};

export function createUnavailableCatalogWriteDependencies(): CatalogWriteRouteDependencies {
  return {
    catalogCategoryWriteService: {
      async createCategory() {
        throw unavailableCatalogError();
      },
      async updateCategory() {
        throw unavailableCatalogError();
      },
      async deleteCategory() {
        throw unavailableCatalogError();
      },
    },
    catalogProductWriteService: {
      async createProduct() {
        throw unavailableCatalogError();
      },
      async updateProduct() {
        throw unavailableCatalogError();
      },
      async deleteProductWithActor() {
        throw unavailableCatalogError();
      },
      async createVariant() {
        throw unavailableCatalogError();
      },
      async updateVariant() {
        throw unavailableCatalogError();
      },
      async deleteVariant() {
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
