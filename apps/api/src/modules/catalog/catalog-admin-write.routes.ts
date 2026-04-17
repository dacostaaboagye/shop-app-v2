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
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import {
  type CatalogWriteRouteDependencies,
  catalogWriteRoutes,
  createUnavailableCatalogWriteDependencies,
} from "./catalog-admin-write-route-support.js";

export function registerCatalogAdminWriteRoutes(
  server: FastifyInstance,
  dependencies: CatalogWriteRouteDependencies = createUnavailableCatalogWriteDependencies(),
) {
  server.route({
    config: { access: catalogWriteRoutes.createCategory.access },
    method: catalogWriteRoutes.createCategory.method,
    url: catalogWriteRoutes.createCategory.url,
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

  server.route({
    config: { access: catalogWriteRoutes.updateCategory.access },
    method: catalogWriteRoutes.updateCategory.method,
    url: catalogWriteRoutes.updateCategory.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
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

  server.route({
    config: { access: catalogWriteRoutes.deleteCategory.access },
    method: catalogWriteRoutes.deleteCategory.method,
    url: catalogWriteRoutes.deleteCategory.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      await dependencies.catalogCategoryWriteService.deleteCategory(slug);
      return { success: true };
    },
  });

  server.route({
    config: { access: catalogWriteRoutes.createProduct.access },
    method: catalogWriteRoutes.createProduct.method,
    url: catalogWriteRoutes.createProduct.url,
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

  server.route({
    config: { access: catalogWriteRoutes.updateProduct.access },
    method: catalogWriteRoutes.updateProduct.method,
    url: catalogWriteRoutes.updateProduct.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
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

  server.route({
    config: { access: catalogWriteRoutes.deleteProduct.access },
    method: catalogWriteRoutes.deleteProduct.method,
    url: catalogWriteRoutes.deleteProduct.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      await dependencies.catalogProductWriteService.deleteProduct(slug);
      return { success: true };
    },
  });

  server.route({
    config: { access: catalogWriteRoutes.createVariant.access },
    method: catalogWriteRoutes.createVariant.method,
    url: catalogWriteRoutes.createVariant.url,
    async handler(request) {
      const { slug: productSlug } = request.params as { slug: string };
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

  server.route({
    config: { access: catalogWriteRoutes.updateVariant.access },
    method: catalogWriteRoutes.updateVariant.method,
    url: catalogWriteRoutes.updateVariant.url,
    async handler(request) {
      const { slug: productSlug, variantSlug } = request.params as {
        slug: string;
        variantSlug: string;
      };
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

  server.route({
    config: { access: catalogWriteRoutes.deleteVariant.access },
    method: catalogWriteRoutes.deleteVariant.method,
    url: catalogWriteRoutes.deleteVariant.url,
    async handler(request) {
      const { slug: productSlug, variantSlug } = request.params as {
        slug: string;
        variantSlug: string;
      };
      await dependencies.catalogProductWriteService.deleteVariant(
        productSlug,
        variantSlug,
      );
      return { success: true };
    },
  });
}
