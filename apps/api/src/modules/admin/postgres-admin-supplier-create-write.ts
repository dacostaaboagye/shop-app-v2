import type {
  AdminCreateSupplierRequest,
  AdminLinkSupplierProductRequest,
} from "@shop/contracts";
import { supplierProducts, suppliers } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import {
  findProduct,
  findSupplier,
} from "./postgres-admin-supplier-write.support.js";

export async function createSupplierRecord(input: {
  actorId: string;
  db: ApiDatabase;
  now: Date;
  payload: AdminCreateSupplierRequest;
  reader: PostgresAdminSupplierQueryRepository;
  slugAllocator: SlugAllocator;
}) {
  const slug = await input.slugAllocator.allocateSlug({
    entityType: "supplier",
    value: input.payload.name,
  });

  await input.db.insert(suppliers).values({
    createdAt: input.now,
    createdBy: input.actorId,
    email: input.payload.email ?? null,
    legalName: input.payload.legalName ?? null,
    name: input.payload.name,
    notes: input.payload.notes ?? null,
    paymentTermsDays: input.payload.paymentTermsDays,
    phone: input.payload.phone ?? null,
    slug,
    status: input.payload.status,
    taxId: input.payload.taxId ?? null,
    updatedAt: input.now,
    website: input.payload.website ?? null,
  });

  const created = await input.reader.getSupplier(slug);
  if (!created) throw new Error("Unable to load created supplier.");
  return created;
}

export async function linkSupplierProductRecord(input: {
  actorId: string;
  db: ApiDatabase;
  now: Date;
  payload: AdminLinkSupplierProductRequest;
  reader: PostgresAdminSupplierQueryRepository;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;
  const product = await findProduct(input.db, input.payload.productSlug);

  await input.db
    .insert(supplierProducts)
    .values({
      createdAt: input.now,
      createdBy: input.actorId,
      isPreferred: input.payload.isPreferred,
      lastCostPrice: input.payload.lastCostPrice ?? null,
      leadTimeDays: input.payload.leadTimeDays,
      minimumOrderQuantity: input.payload.minimumOrderQuantity,
      notes: input.payload.notes ?? null,
      productId: product.id,
      supplierId: supplier.id,
      supplierProductCode: input.payload.supplierProductCode ?? null,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [supplierProducts.supplierId, supplierProducts.productId],
      set: {
        isPreferred: input.payload.isPreferred,
        lastCostPrice: input.payload.lastCostPrice ?? null,
        leadTimeDays: input.payload.leadTimeDays,
        minimumOrderQuantity: input.payload.minimumOrderQuantity,
        notes: input.payload.notes ?? null,
        supplierProductCode: input.payload.supplierProductCode ?? null,
        updatedAt: input.now,
      },
    });

  return input.reader.getSupplier(input.supplierSlug);
}

export async function unlinkSupplierProductRecord(input: {
  db: ApiDatabase;
  productSlug: string;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return false;
  const product = await findProduct(input.db, input.productSlug);
  const result = await input.db
    .delete(supplierProducts)
    .where(
      and(
        eq(supplierProducts.supplierId, supplier.id),
        eq(supplierProducts.productId, product.id),
      ),
    );

  return (result.rowCount ?? 0) > 0;
}
