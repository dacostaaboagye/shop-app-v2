import type {
  AdminBrandSummary,
  AdminCategorySummary,
  AdminProductDetail,
} from "@shop/contracts";
import type { PlatformEventRecord } from "../events/platform-event.types.js";
import {
  type CatalogActor,
  createCatalogEvent,
  formatCatalogPathSummary,
  formatParentSummary,
} from "./catalog-event-support.js";

export function createCatalogBrandCreatedEvent(input: {
  actor: CatalogActor;
  brand: AdminBrandSummary;
  occurredAt: Date;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      brandName: input.brand.name,
      brandSlug: input.brand.slug,
      status: input.brand.status,
    },
    reference: input.brand.slug,
    resourceKind: "catalog_brand",
    summary: `Catalog brand created: ${input.brand.name} (${input.brand.slug}) is ${input.brand.status}.`,
    type: "catalog.brand.created",
  });
}

export function createCatalogBrandUpdatedEvent(input: {
  actor: CatalogActor;
  brand: AdminBrandSummary;
  occurredAt: Date;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      brandName: input.brand.name,
      brandSlug: input.brand.slug,
      status: input.brand.status,
    },
    reference: input.brand.slug,
    resourceKind: "catalog_brand",
    summary: `Catalog brand updated: ${input.brand.name} (${input.brand.slug}) is ${input.brand.status}.`,
    type: "catalog.brand.updated",
  });
}

export function createCatalogBrandDeletedEvent(input: {
  actor: CatalogActor;
  brand: Pick<AdminBrandSummary, "name" | "slug" | "status">;
  occurredAt: Date;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      brandName: input.brand.name,
      brandSlug: input.brand.slug,
      status: input.brand.status,
    },
    reference: input.brand.slug,
    resourceKind: "catalog_brand",
    summary: `Catalog brand deleted: ${input.brand.name} (${input.brand.slug}) was ${input.brand.status}.`,
    type: "catalog.brand.deleted",
  });
}

export function createCatalogCategoryCreatedEvent(input: {
  actor: CatalogActor;
  category: AdminCategorySummary;
  occurredAt: Date;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      categoryName: input.category.name,
      categorySlug: input.category.slug,
      parentCategorySlug: input.category.parentCategorySlug ?? null,
      status: input.category.status,
    },
    reference: input.category.slug,
    resourceKind: "catalog_category",
    summary: `Catalog category created: ${input.category.name} (${input.category.slug})${formatParentSummary(input.category.parentCategorySlug)} and is ${input.category.status}.`,
    type: "catalog.category.created",
  });
}

export function createCatalogCategoryUpdatedEvent(input: {
  actor: CatalogActor;
  category: AdminCategorySummary;
  occurredAt: Date;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      categoryName: input.category.name,
      categorySlug: input.category.slug,
      parentCategorySlug: input.category.parentCategorySlug ?? null,
      status: input.category.status,
    },
    reference: input.category.slug,
    resourceKind: "catalog_category",
    summary: `Catalog category updated: ${input.category.name} (${input.category.slug})${formatParentSummary(input.category.parentCategorySlug)} and is ${input.category.status}.`,
    type: "catalog.category.updated",
  });
}

export function createCatalogCategoryDeletedEvent(input: {
  actor: CatalogActor;
  category: Pick<
    AdminCategorySummary,
    "name" | "parentCategorySlug" | "slug" | "status"
  >;
  occurredAt: Date;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      categoryName: input.category.name,
      categorySlug: input.category.slug,
      parentCategorySlug: input.category.parentCategorySlug ?? null,
      status: input.category.status,
    },
    reference: input.category.slug,
    resourceKind: "catalog_category",
    summary: `Catalog category deleted: ${input.category.name} (${input.category.slug})${formatParentSummary(input.category.parentCategorySlug)} and was ${input.category.status}.`,
    type: "catalog.category.deleted",
  });
}

export function createCatalogProductCreatedEvent(input: {
  actor: CatalogActor;
  occurredAt: Date;
  product: AdminProductDetail;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      brandSlug: input.product.brandSlug ?? null,
      categorySlug: input.product.categorySlug ?? null,
      productName: input.product.name,
      productSlug: input.product.slug,
      status: input.product.status,
      variantCount: input.product.variantCount,
    },
    reference: input.product.slug,
    resourceKind: "catalog_product",
    summary: `Catalog product created: ${input.product.name} (${input.product.slug})${formatCatalogPathSummary(input.product)} with ${input.product.variantCount} variant${input.product.variantCount === 1 ? "" : "s"}.`,
    type: "catalog.product.created",
  });
}

export function createCatalogProductUpdatedEvent(input: {
  actor: CatalogActor;
  occurredAt: Date;
  product: AdminProductDetail;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      brandSlug: input.product.brandSlug ?? null,
      categorySlug: input.product.categorySlug ?? null,
      productName: input.product.name,
      productSlug: input.product.slug,
      status: input.product.status,
      variantCount: input.product.variantCount,
    },
    reference: input.product.slug,
    resourceKind: "catalog_product",
    summary: `Catalog product updated: ${input.product.name} (${input.product.slug})${formatCatalogPathSummary(input.product)} with ${input.product.variantCount} variant${input.product.variantCount === 1 ? "" : "s"}.`,
    type: "catalog.product.updated",
  });
}

export function createCatalogProductDeletedEvent(input: {
  actor: CatalogActor;
  occurredAt: Date;
  product: Pick<
    AdminProductDetail,
    "brandSlug" | "categorySlug" | "name" | "slug" | "status" | "variantCount"
  >;
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      brandSlug: input.product.brandSlug ?? null,
      categorySlug: input.product.categorySlug ?? null,
      productName: input.product.name,
      productSlug: input.product.slug,
      status: input.product.status,
      variantCount: input.product.variantCount,
    },
    reference: input.product.slug,
    resourceKind: "catalog_product",
    summary: `Catalog product deleted: ${input.product.name} (${input.product.slug})${formatCatalogPathSummary(input.product)} with ${input.product.variantCount} variant${input.product.variantCount === 1 ? "" : "s"}.`,
    type: "catalog.product.deleted",
  });
}

export function createCatalogVariantCreatedEvent(input: {
  actor: CatalogActor;
  occurredAt: Date;
  productSlug: string;
  variant: {
    isDefault: boolean;
    name: string;
    sku: string;
    slug: string;
    status: string;
  };
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      isDefault: input.variant.isDefault,
      productSlug: input.productSlug,
      sku: input.variant.sku,
      status: input.variant.status,
      variantName: input.variant.name,
      variantSlug: input.variant.slug,
    },
    reference: input.variant.slug,
    resourceKind: "catalog_variant",
    summary: `Catalog variant created under ${input.productSlug}: ${input.variant.name} (${input.variant.slug} / ${input.variant.sku}) is ${input.variant.status}.`,
    type: "catalog.variant.created",
  });
}

export function createCatalogVariantUpdatedEvent(input: {
  actor: CatalogActor;
  occurredAt: Date;
  productSlug: string;
  variant: {
    isDefault: boolean;
    name: string;
    sku: string;
    slug: string;
    status: string;
  };
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      isDefault: input.variant.isDefault,
      productSlug: input.productSlug,
      sku: input.variant.sku,
      status: input.variant.status,
      variantName: input.variant.name,
      variantSlug: input.variant.slug,
    },
    reference: input.variant.slug,
    resourceKind: "catalog_variant",
    summary: `Catalog variant updated under ${input.productSlug}: ${input.variant.name} (${input.variant.slug} / ${input.variant.sku}) is ${input.variant.status}.`,
    type: "catalog.variant.updated",
  });
}

export function createCatalogVariantDeletedEvent(input: {
  actor: CatalogActor;
  occurredAt: Date;
  variant: {
    productSlug: string;
    sku: string;
    variantName: string;
    variantSlug: string;
  };
}): PlatformEventRecord {
  return createCatalogEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      productSlug: input.variant.productSlug,
      sku: input.variant.sku,
      variantName: input.variant.variantName,
      variantSlug: input.variant.variantSlug,
    },
    reference: input.variant.variantSlug,
    resourceKind: "catalog_variant",
    summary: `Catalog variant deleted from ${input.variant.productSlug}: ${input.variant.variantName} (${input.variant.variantSlug} / ${input.variant.sku}).`,
    type: "catalog.variant.deleted",
  });
}
