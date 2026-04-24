import {
  catalogProducts,
  locations,
  productVariants,
  supplierProcurementOrderLines,
  supplierProducts,
  suppliers,
  supplierTransactions,
} from "@shop/database";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

type ProcurementStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled"
  | "closed";

type ProcurementTransaction = Pick<ApiDatabase, "insert" | "select" | "update">;

export async function findSupplier(db: ApiDatabase, slug: string) {
  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.slug, slug))
    .limit(1);
  return supplier ?? null;
}

export async function resolveLocationId(db: ApiDatabase, slug: string) {
  const [location] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.slug, slug))
    .limit(1);
  if (!location) {
    throw new AppError({
      code: "not_found",
      detail: `Location "${slug}" does not exist.`,
      statusCode: 404,
      title: "Location not found",
    });
  }
  return location.id;
}

export async function resolveLinkedSupplierVariants(
  db: ApiDatabase,
  input: { supplierId: string; variantSlugs: string[] },
) {
  const rows = await db
    .select({ id: productVariants.id, slug: productVariants.slug })
    .from(productVariants)
    .innerJoin(
      catalogProducts,
      eq(catalogProducts.id, productVariants.productId),
    )
    .innerJoin(
      supplierProducts,
      and(
        eq(supplierProducts.productId, catalogProducts.id),
        eq(supplierProducts.supplierId, input.supplierId),
      ),
    )
    .where(inArray(productVariants.slug, input.variantSlugs));
  const map = new Map(rows.map((row) => [row.slug, row.id]));
  for (const variantSlug of input.variantSlugs) {
    if (!map.has(variantSlug)) throw missingVariant(variantSlug);
  }
  return map;
}

export function missingVariant(variantSlug: string): never {
  throw new AppError({
    code: "validation_error",
    detail: `Variant "${variantSlug}" is not linked through this supplier's product relationships.`,
    statusCode: 400,
    title: "Supplier cannot supply SKU",
  });
}

export function assertTransitionAllowed(
  current: ProcurementStatus,
  next: ProcurementStatus,
) {
  const allowed: Record<ProcurementStatus, ProcurementStatus[]> = {
    approved: ["ordered", "cancelled"],
    cancelled: [],
    closed: [],
    draft: ["submitted", "cancelled"],
    ordered: ["cancelled"],
    partially_received: ["closed"],
    received: ["closed"],
    submitted: ["approved", "cancelled"],
  };

  if (!allowed[current].includes(next)) {
    throw invalidProcurementTransition(current, next);
  }
}

export function invalidProcurementTransition(
  current: string,
  next: string,
): AppError {
  return new AppError({
    code: "validation_error",
    detail: `Supplier procurement order cannot move from "${current}" to "${next}".`,
    statusCode: 409,
    title: "Invalid procurement lifecycle transition",
  });
}

export function procurementStatusDescription(status: string) {
  const descriptions: Record<string, string> = {
    approved: "Supplier purchase order approved.",
    cancelled: "Supplier purchase order cancelled.",
    closed: "Supplier purchase order closed.",
    ordered: "Supplier purchase order sent to supplier.",
    submitted: "Supplier purchase order submitted for approval.",
  };
  return descriptions[status] ?? "Supplier purchase order updated.";
}

export async function insertSupplierTransaction(
  tx: ProcurementTransaction,
  input: {
    actorId: string;
    description: string;
    now: Date;
    reference: string;
    status: string;
    supplierId: string;
    transactionType: "goods_receipt" | "purchase_order";
  },
) {
  await tx.insert(supplierTransactions).values({
    createdAt: input.now,
    createdBy: input.actorId,
    description: input.description,
    reference: input.reference,
    relatedDocumentReference: input.reference,
    relatedDocumentType: "supplier_purchase_order",
    status: input.status,
    supplierId: input.supplierId,
    transactionType: input.transactionType,
    updatedAt: input.now,
  });
}

export async function resolveReceivedStatus(
  tx: ProcurementTransaction,
  orderId: string,
) {
  const rows = await tx
    .select({
      approvedQuantity: supplierProcurementOrderLines.approvedQuantity,
      receivedQuantity: supplierProcurementOrderLines.receivedQuantity,
      requestedQuantity: supplierProcurementOrderLines.requestedQuantity,
    })
    .from(supplierProcurementOrderLines)
    .where(eq(supplierProcurementOrderLines.orderId, orderId));
  const allReceived = rows.every((line) => {
    const expected = line.approvedQuantity ?? line.requestedQuantity;
    return line.receivedQuantity >= expected;
  });
  const hasReceipt = rows.some((line) => line.receivedQuantity > 0);
  if (allReceived) return "received" as const;
  if (hasReceipt) return "partially_received" as const;
  return "ordered" as const;
}

export function requestedQuantitySql() {
  return sql`requested_quantity`;
}
