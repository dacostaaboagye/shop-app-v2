import {
  adminCreateCategoryRequestSchema,
  adminCreateCategoryResponseSchema,
  adminCreateProductRequestSchema,
  adminCreateProductResponseSchema,
  adminCreateVariantRequestSchema,
  adminCreateVariantResponseSchema,
  adminUpdateCategoryRequestSchema,
  adminUpdateCategoryResponseSchema,
  adminUpdateProductRequestSchema,
  adminUpdateProductResponseSchema,
  adminUpdateVariantRequestSchema,
  adminUpdateVariantResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { CatalogCategoryWriteService } from "./catalog-category-write.service.js";
import type { CatalogProductWriteService } from "./catalog-product-write.service.js";

type CatalogWriteRouteDependencies = {
  catalogCategoryWriteService: Pick<
    CatalogCategoryWriteService,
    "createCategory" | "updateCategory" | "deleteCategory"
  >;
  catalogProductWriteService: Pick<
    CatalogProductWriteService,
    | "createProduct"
    | "updateProduct"
    | "deleteProduct"
    | "createVariant"
    | "updateVariant"
    | "deleteVariant"
  >;
};

const createCategoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.categories.manage" },
  method: "POST",
  url: "/api/admin/catalog/categories",
};

const updateCategoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.categories.manage" },
  method: "PATCH",
  url: "/api/admin/catalog/categories/:slug",
};

const deleteCategoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.categories.manage" },
  method: "DELETE",
  url: "/api/admin/catalog/categories/:slug",
};

const createProductRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "POST",
  url: "/api/admin/catalog/products",
};

const updateProductRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "PATCH",
  url: "/api/admin/catalog/products/:slug",
};

const deleteProductRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "DELETE",
  url: "/api/admin/catalog/products/:slug",
};

const createVariantRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "POST",
  url: "/api/admin/catalog/products/:slug/variants",
};

const updateVariantRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "PATCH",
  url: "/api/admin/catalog/products/:slug/variants/:variantSlug",
};

const deleteVariantRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.products.manage" },
  method: "DELETE",
  url: "/api/admin/catalog/products/:slug/variants/:variantSlug",
};

export function registerCatalogAdminWriteRoutes(
  server: FastifyInstance,
  dependencies: CatalogWriteRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: createCategoryRoute.access },
    method: createCategoryRoute.method,
    url: createCategoryRoute.url,
    async handler(request) {
      const payload = adminCreateCategoryRequestSchema.parse(request.body);
      const result =
        await dependencies.catalogCategoryWriteService.createCategory(
          getAuthenticatedUserId(request),
          payload,
          new Date(),
        );
      return adminCreateCategoryResponseSchema.parse(result);
    },
  });

  server.route<{ Params: { slug: string } }>({
    config: { access: updateCategoryRoute.access },
    method: updateCategoryRoute.method,
    url: updateCategoryRoute.url,
    async handler(request) {
      const { slug } = request.params;
      const payload = adminUpdateCategoryRequestSchema.parse(request.body);
      const result =
        await dependencies.catalogCategoryWriteService.updateCategory(
          getAuthenticatedUserId(request),
          slug,
          payload,
          new Date(),
        );

      if (!result) {
        throw new AppError({
          code: "not_found",
          detail: `Category "${slug}" does not exist.`,
          statusCode: 404,
          title: "Category not found",
        });
      }

      return adminUpdateCategoryResponseSchema.parse(result);
    },
  });

  server.route<{ Params: { slug: string } }>({
    config: { access: deleteCategoryRoute.access },
    method: deleteCategoryRoute.method,
    url: deleteCategoryRoute.url,
    async handler(request) {
      const { slug } = request.params;
      await dependencies.catalogCategoryWriteService.deleteCategory(slug);
      return { success: true };
    },
  });

  server.route({
    config: { access: createProductRoute.access },
    method: createProductRoute.method,
    url: createProductRoute.url,
    async handler(request) {
      const payload = adminCreateProductRequestSchema.parse(request.body);
      const result =
        await dependencies.catalogProductWriteService.createProduct(
          getAuthenticatedUserId(request),
          payload,
          new Date(),
        );
      return adminCreateProductResponseSchema.parse(result);
    },
  });

  server.route<{ Params: { slug: string } }>({
    config: { access: updateProductRoute.access },
    method: updateProductRoute.method,
    url: updateProductRoute.url,
    async handler(request) {
      const { slug } = request.params;
      const payload = adminUpdateProductRequestSchema.parse(request.body);
      const result =
        await dependencies.catalogProductWriteService.updateProduct(
          getAuthenticatedUserId(request),
          slug,
          payload,
          new Date(),
        );

      if (!result) {
        throw new AppError({
          code: "not_found",
          detail: `Product "${slug}" does not exist.`,
          statusCode: 404,
          title: "Product not found",
        });
      }

      return adminUpdateProductResponseSchema.parse(result);
    },
  });

  server.route<{ Params: { slug: string } }>({
    config: { access: deleteProductRoute.access },
    method: deleteProductRoute.method,
    url: deleteProductRoute.url,
    async handler(request) {
      const { slug } = request.params;
      await dependencies.catalogProductWriteService.deleteProduct(slug);
      return { success: true };
    },
  });

  server.route<{ Params: { slug: string } }>({
    config: { access: createVariantRoute.access },
    method: createVariantRoute.method,
    url: createVariantRoute.url,
    async handler(request) {
      const { slug: productSlug } = request.params;
      const payload = adminCreateVariantRequestSchema.parse(request.body);
      const result =
        await dependencies.catalogProductWriteService.createVariant(
          getAuthenticatedUserId(request),
          productSlug,
          payload,
          new Date(),
        );
      return adminCreateVariantResponseSchema.parse(result);
    },
  });

  server.route<{ Params: { slug: string; variantSlug: string } }>({
    config: { access: updateVariantRoute.access },
    method: updateVariantRoute.method,
    url: updateVariantRoute.url,
    async handler(request) {
      const { slug: productSlug, variantSlug } = request.params;
      const payload = adminUpdateVariantRequestSchema.parse(request.body);
      const result =
        await dependencies.catalogProductWriteService.updateVariant(
          getAuthenticatedUserId(request),
          productSlug,
          variantSlug,
          payload,
          new Date(),
        );

      if (!result) {
        throw new AppError({
          code: "not_found",
          detail: `Variant "${variantSlug}" does not exist on product "${productSlug}".`,
          statusCode: 404,
          title: "Variant not found",
        });
      }

      return adminUpdateVariantResponseSchema.parse(result);
    },
  });

  server.route<{ Params: { slug: string; variantSlug: string } }>({
    config: { access: deleteVariantRoute.access },
    method: deleteVariantRoute.method,
    url: deleteVariantRoute.url,
    async handler(request) {
      const { slug: productSlug, variantSlug } = request.params;
      await dependencies.catalogProductWriteService.deleteVariant(
        productSlug,
        variantSlug,
      );
      return { success: true };
    },
  });
}

function createUnavailableDependencies(): CatalogWriteRouteDependencies {
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
      async createVariant() {
        throw unavailableCatalogError();
      },
      async updateVariant() {
        throw unavailableCatalogError();
      },
      async deleteProduct() {
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
