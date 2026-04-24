import type {
  AdminUpdateVariantRequest,
  AdminVariantSummary,
} from "@shop/contracts";
import { catalogProducts, productVariants } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export function getVariantStatusPatch(
  payload: Pick<AdminUpdateVariantRequest, "isDefault" | "status">,
  now: Date,
): {
  archivedAt: Date | null | undefined;
  isDefault: boolean | undefined;
} {
  if (payload.status === "archived") {
    if (payload.isDefault === true) {
      throw new AppError({
        code: "validation_error",
        detail: "Archived variants cannot remain the default variant.",
        statusCode: 400,
        title: "Invalid variant state",
      });
    }

    return {
      archivedAt: now,
      isDefault: false,
    };
  }

  if (payload.status === "active") {
    return {
      archivedAt: null,
      isDefault: payload.isDefault,
    };
  }

  return {
    archivedAt: undefined,
    isDefault: payload.isDefault,
  };
}

export async function findProductIdBySlug(
  db: ApiDatabase,
  productSlug: string,
): Promise<string | null> {
  const [product] = await db
    .select({ id: catalogProducts.id })
    .from(catalogProducts)
    .where(eq(catalogProducts.slug, productSlug));

  return product?.id ?? null;
}

export async function requireProductIdBySlug(
  db: ApiDatabase,
  productSlug: string,
): Promise<string> {
  const productId = await findProductIdBySlug(db, productSlug);

  if (!productId) {
    throw new AppError({
      code: "not_found",
      detail: `Product "${productSlug}" does not exist.`,
      statusCode: 404,
      title: "Product not found",
    });
  }

  return productId;
}

export async function clearExistingDefaultVariant(
  db: ApiDatabase,
  now: Date,
  productId: string,
): Promise<void> {
  await db
    .update(productVariants)
    .set({ isDefault: false, updatedAt: now })
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.isDefault, true),
      ),
    );
}

export function toAdminVariantSummary(
  variant: typeof productVariants.$inferSelect,
): AdminVariantSummary {
  return {
    slug: variant.slug,
    name: variant.name,
    sku: variant.sku,
    barcode: variant.barcode,
    unitOfMeasure: variant.unitOfMeasure,
    costPrice: variant.costPrice,
    sellingPrice: variant.sellingPrice,
    attributes: variant.attributes,
    weightGrams: variant.weightGrams,
    dimensionsCm: variant.dimensionsCm ?? null,
    packagingType: variant.packagingType,
    manufacturerPartNumber: variant.manufacturerPartNumber,
    customsCode: variant.customsCode,
    isTaxable: variant.isTaxable,
    taxCategory: variant.taxCategory,
    isDefault: variant.isDefault,
    status: variant.status,
    createdAt: variant.createdAt.toISOString(),
    archivedAt: variant.archivedAt?.toISOString() ?? null,
  };
}
