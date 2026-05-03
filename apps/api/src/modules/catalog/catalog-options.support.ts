import { catalogProductOptions, catalogProducts } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export async function requireProductByOptionsSlug(
  db: ApiDatabase,
  productSlug: string,
): Promise<{ id: string }> {
  const product = await db.query.catalogProducts.findFirst({
    where: eq(catalogProducts.slug, productSlug),
    columns: { id: true },
  });
  if (!product) {
    throw new AppError({
      code: "not_found",
      detail: `Product "${productSlug}" does not exist.`,
      statusCode: 404,
      title: "Product not found",
    });
  }
  return product;
}

export async function requireOptionById(
  db: ApiDatabase,
  optionId: string,
): Promise<{ productId: string }> {
  const option = await db.query.catalogProductOptions.findFirst({
    where: eq(catalogProductOptions.id, optionId),
    columns: { productId: true },
  });
  if (!option) {
    throw new AppError({
      code: "not_found",
      detail: "Option does not exist.",
      statusCode: 404,
      title: "Option not found",
    });
  }
  return option;
}

export function optionNotFound(productSlug: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Option does not exist on product "${productSlug}".`,
    statusCode: 404,
    title: "Option not found",
  });
}

export function optionValueNotFound(): AppError {
  return new AppError({
    code: "not_found",
    detail: "Option value not found.",
    statusCode: 404,
    title: "Value not found",
  });
}
