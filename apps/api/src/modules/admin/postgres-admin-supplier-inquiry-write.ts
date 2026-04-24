import type {
  AdminCreateSupplierInquiryRequest,
  AdminUpdateSupplierInquiryRequest,
} from "@shop/contracts";
import { supplierInquiries } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import {
  findProduct,
  findSupplier,
} from "./postgres-admin-supplier-write.support.js";

export async function createSupplierInquiry(input: {
  actorId: string;
  db: ApiDatabase;
  now: Date;
  payload: AdminCreateSupplierInquiryRequest;
  reader: PostgresAdminSupplierQueryRepository;
  reference: string;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;
  const product = input.payload.productSlug
    ? await findProduct(input.db, input.payload.productSlug)
    : null;

  await input.db.insert(supplierInquiries).values({
    attachmentMimeType: input.payload.attachmentMimeType ?? null,
    attachmentName: input.payload.attachmentName ?? null,
    attachmentUrl: input.payload.attachmentUrl ?? null,
    createdAt: input.now,
    message: input.payload.message,
    neededBy: input.payload.neededBy ? new Date(input.payload.neededBy) : null,
    productId: product?.id ?? null,
    reference: input.reference,
    requestedProductName: input.payload.requestedProductName ?? null,
    requestedBy: input.actorId,
    requestedQuantity: input.payload.requestedQuantity ?? null,
    status: "sent",
    supplierId: supplier.id,
    updatedAt: input.now,
  });

  return input.reader.getSupplier(input.supplierSlug);
}

export async function updateSupplierInquiry(input: {
  actorId: string;
  db: ApiDatabase;
  now: Date;
  payload: AdminUpdateSupplierInquiryRequest;
  reader: PostgresAdminSupplierQueryRepository;
  reference: string;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;
  const [row] = await input.db
    .update(supplierInquiries)
    .set({ status: input.payload.status, updatedAt: input.now })
    .where(
      and(
        eq(supplierInquiries.supplierId, supplier.id),
        eq(supplierInquiries.reference, input.reference),
      ),
    )
    .returning({ reference: supplierInquiries.reference });

  return row ? input.reader.getSupplier(input.supplierSlug) : null;
}
