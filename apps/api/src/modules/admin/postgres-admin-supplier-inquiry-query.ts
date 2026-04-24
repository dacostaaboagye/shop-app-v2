import {
  catalogProducts,
  productVariants,
  supplierInquiries,
  supplierProducts,
} from "@shop/database";
import { asc, desc, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export async function listSupplierProductVariants(
  db: ApiDatabase,
  supplierId: string,
) {
  return db
    .select({
      productSlug: catalogProducts.slug,
      sku: productVariants.sku,
      variantName: productVariants.name,
      variantSlug: productVariants.slug,
    })
    .from(supplierProducts)
    .innerJoin(
      catalogProducts,
      eq(catalogProducts.id, supplierProducts.productId),
    )
    .innerJoin(
      productVariants,
      eq(productVariants.productId, catalogProducts.id),
    )
    .where(eq(supplierProducts.supplierId, supplierId))
    .orderBy(asc(catalogProducts.name), asc(productVariants.name));
}

export async function listSupplierInquiries(
  db: ApiDatabase,
  supplierId: string,
) {
  return db
    .select({
      attachmentMimeType: supplierInquiries.attachmentMimeType,
      attachmentName: supplierInquiries.attachmentName,
      attachmentUrl: supplierInquiries.attachmentUrl,
      createdAt: supplierInquiries.createdAt,
      message: supplierInquiries.message,
      neededBy: supplierInquiries.neededBy,
      productName: catalogProducts.name,
      productSlug: catalogProducts.slug,
      reference: supplierInquiries.reference,
      requestedProductName: supplierInquiries.requestedProductName,
      requestedQuantity: supplierInquiries.requestedQuantity,
      status: supplierInquiries.status,
      supplierResponse: supplierInquiries.supplierResponse,
    })
    .from(supplierInquiries)
    .leftJoin(
      catalogProducts,
      eq(catalogProducts.id, supplierInquiries.productId),
    )
    .where(eq(supplierInquiries.supplierId, supplierId))
    .orderBy(desc(supplierInquiries.createdAt))
    .limit(50);
}
