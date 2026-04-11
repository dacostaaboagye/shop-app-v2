import {
  type AdminProductDetail,
  type AdminVariantSummary,
  adminCategoryListQuerySchema,
  adminCategoryListResponseSchema,
  adminCategorySummarySchema,
  adminProductDetailSchema,
  adminProductListQuerySchema,
  adminProductListResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { CatalogCategoryQueryService } from "./catalog-category-query.service.js";
import type { CatalogProductQueryService } from "./catalog-product-query.service.js";

type CatalogQueryRouteDependencies = {
  catalogCategoryQueryService: Pick<
    CatalogCategoryQueryService,
    "getCategory" | "listCategories"
  >;
  catalogProductQueryService: Pick<
    CatalogProductQueryService,
    "getProduct" | "listProducts"
  >;
  permissionResolutionService: Pick<
    PermissionResolutionService,
    "resolvePermissions"
  >;
};

const listCategoriesRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.view" },
  method: "GET",
  url: "/api/admin/catalog/categories",
};

const getCategoryRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.view" },
  method: "GET",
  url: "/api/admin/catalog/categories/:slug",
};

const listProductsRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.view" },
  method: "GET",
  url: "/api/admin/catalog/products",
};

const getProductRoute: RouteDefinition = {
  access: { kind: "permission", permission: "catalog.view" },
  method: "GET",
  url: "/api/admin/catalog/products/:slug",
};

export function registerCatalogAdminQueryRoutes(
  server: FastifyInstance,
  dependencies: CatalogQueryRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: listCategoriesRoute.access },
    method: listCategoriesRoute.method,
    url: listCategoriesRoute.url,
    async handler(request) {
      const query = adminCategoryListQuerySchema.parse(request.query);
      const response =
        await dependencies.catalogCategoryQueryService.listCategories(query);
      return adminCategoryListResponseSchema.parse(response);
    },
  });

  server.route({
    config: { access: getCategoryRoute.access },
    method: getCategoryRoute.method,
    url: getCategoryRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const category =
        await dependencies.catalogCategoryQueryService.getCategory(slug);

      if (!category) {
        throw new AppError({
          code: "not_found",
          detail: `Category "${slug}" does not exist.`,
          statusCode: 404,
          title: "Category not found",
        });
      }

      return adminCategorySummarySchema.parse(category);
    },
  });

  server.route({
    config: { access: listProductsRoute.access },
    method: listProductsRoute.method,
    url: listProductsRoute.url,
    async handler(request) {
      const query = adminProductListQuerySchema.parse(request.query);
      const response =
        await dependencies.catalogProductQueryService.listProducts(query);
      return adminProductListResponseSchema.parse(response);
    },
  });

  server.route({
    config: { access: getProductRoute.access },
    method: getProductRoute.method,
    url: getProductRoute.url,
    async handler(request) {
      const { slug } = request.params as { slug: string };
      const product =
        await dependencies.catalogProductQueryService.getProduct(slug);

      if (!product) {
        throw new AppError({
          code: "not_found",
          detail: `Product "${slug}" does not exist.`,
          statusCode: 404,
          title: "Product not found",
        });
      }

      const canSeeCostPrice = await checkCostPricePermission(
        dependencies,
        request,
      );

      const sanitized: AdminProductDetail = canSeeCostPrice
        ? product
        : {
            ...product,
            variants: product.variants.map(stripCostPrice),
          };

      return adminProductDetailSchema.parse(sanitized);
    },
  });
}

async function checkCostPricePermission(
  dependencies: Pick<
    CatalogQueryRouteDependencies,
    "permissionResolutionService"
  >,
  request: Parameters<typeof getAuthenticatedUserId>[0],
): Promise<boolean> {
  try {
    const userId = getAuthenticatedUserId(request);
    const permissions =
      await dependencies.permissionResolutionService.resolvePermissions({
        userId,
      });
    return permissions.some((p) => p.key === "catalog.cost_price.view");
  } catch {
    return false;
  }
}

function stripCostPrice(variant: AdminVariantSummary): AdminVariantSummary {
  return { ...variant, costPrice: "0.00" };
}

function createUnavailableDependencies(): CatalogQueryRouteDependencies {
  return {
    catalogCategoryQueryService: {
      async getCategory() {
        throw unavailableCatalogError();
      },
      async listCategories() {
        throw unavailableCatalogError();
      },
    },
    catalogProductQueryService: {
      async getProduct() {
        throw unavailableCatalogError();
      },
      async listProducts() {
        throw unavailableCatalogError();
      },
    },
    permissionResolutionService: {
      async resolvePermissions() {
        return [];
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
