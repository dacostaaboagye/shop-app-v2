import type { AdminUpdateSupplierRequest } from "@shop/contracts";
import { catalogProducts, suppliers, users } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export async function findProduct(db: ApiDatabase, slug: string) {
  const [product] = await db
    .select({ id: catalogProducts.id })
    .from(catalogProducts)
    .where(eq(catalogProducts.slug, slug))
    .limit(1);

  if (!product) {
    throw new AppError({
      code: "not_found",
      detail: `Product "${slug}" does not exist.`,
      statusCode: 404,
      title: "Product not found",
    });
  }

  return product;
}

export async function findSupplier(db: ApiDatabase, slug: string) {
  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.slug, slug))
    .limit(1);

  return supplier ?? null;
}

export async function resolveUserId(db: ApiDatabase, slug: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.slug, slug))
    .limit(1);

  if (!user) {
    throw new AppError({
      code: "not_found",
      detail: `User "${slug}" does not exist.`,
      statusCode: 404,
      title: "User not found",
    });
  }

  return user.id;
}

export async function updateSupplierProfile(
  db: ApiDatabase,
  input: {
    now: Date;
    payload: AdminUpdateSupplierRequest;
    supplierSlug: string;
  },
) {
  const [row] = await db
    .update(suppliers)
    .set({
      ...("email" in input.payload && { email: input.payload.email ?? null }),
      ...("legalName" in input.payload && {
        legalName: input.payload.legalName ?? null,
      }),
      ...(input.payload.name !== undefined && { name: input.payload.name }),
      ...("notes" in input.payload && { notes: input.payload.notes ?? null }),
      ...(input.payload.paymentTermsDays !== undefined && {
        paymentTermsDays: input.payload.paymentTermsDays,
      }),
      ...("phone" in input.payload && { phone: input.payload.phone ?? null }),
      ...(input.payload.status !== undefined && {
        status: input.payload.status,
      }),
      ...("taxId" in input.payload && { taxId: input.payload.taxId ?? null }),
      ...(input.payload.website !== undefined && {
        website: input.payload.website ?? null,
      }),
      updatedAt: input.now,
    })
    .where(eq(suppliers.slug, input.supplierSlug))
    .returning({ slug: suppliers.slug });

  return row ?? null;
}
