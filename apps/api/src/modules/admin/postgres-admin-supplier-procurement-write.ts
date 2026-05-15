import type { AdminCreateSupplierProcurementOrderRequest } from "@shop/contracts";
import {
  supplierProcurementOrderLines,
  supplierProcurementOrders,
} from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  assertTransitionAllowed,
  findSupplier,
  insertSupplierTransaction,
  missingVariant,
  procurementStatusDescription,
  requestedQuantitySql,
  resolveLinkedSupplierVariants,
  resolveLocationId,
} from "./postgres-admin-supplier-procurement-write.support.js";
import type { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";

type TransitionStatus =
  | "submitted"
  | "approved"
  | "ordered"
  | "cancelled"
  | "closed";

export async function createSupplierProcurementOrder(input: {
  actorId: string;
  db: ApiDatabase;
  now: Date;
  payload: AdminCreateSupplierProcurementOrderRequest;
  reader: PostgresAdminSupplierQueryRepository;
  reference: string;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;
  const destinationLocationId = input.payload.destinationLocationSlug
    ? await resolveLocationId(input.db, input.payload.destinationLocationSlug)
    : null;
  const variants = await resolveLinkedSupplierVariants(input.db, {
    supplierId: supplier.id,
    variantSlugs: input.payload.lines.map((line) => line.variantSlug),
  });

  await input.db.transaction(async (tx) => {
    const [order] = await tx
      .insert(supplierProcurementOrders)
      .values({
        createdAt: input.now,
        destinationLocationId,
        expectedAt: input.payload.expectedAt
          ? new Date(input.payload.expectedAt)
          : null,
        notes: input.payload.notes ?? null,
        reference: input.reference,
        requestedBy: input.actorId,
        status: "draft",
        supplierId: supplier.id,
        updatedAt: input.now,
      })
      .returning({ id: supplierProcurementOrders.id });
    if (!order) throw new Error("Failed to create supplier procurement order.");

    await tx.insert(supplierProcurementOrderLines).values(
      input.payload.lines.map((line) => ({
        createdAt: input.now,
        orderId: order.id,
        requestedQuantity: line.requestedQuantity,
        skuId:
          variants.get(line.variantSlug) ?? missingVariant(line.variantSlug),
        unitCost: line.unitCost ?? null,
        updatedAt: input.now,
      })),
    );
    await insertSupplierTransaction(tx, {
      actorId: input.actorId,
      description: "Draft supplier purchase order created.",
      now: input.now,
      reference: input.reference,
      status: "draft",
      supplierId: supplier.id,
      transactionType: "purchase_order",
    });
  });

  return input.reader.getSupplier(input.supplierSlug);
}

export async function transitionSupplierProcurementOrder(input: {
  actorId: string;
  db: ApiDatabase;
  notes: string | null;
  now: Date;
  reader: PostgresAdminSupplierQueryRepository;
  reference: string;
  status: TransitionStatus;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;
  const order = await findOrder(input.db, supplier.id, input.reference);
  if (!order) return null;
  assertTransitionAllowed(order.status, input.status);

  await input.db.transaction(async (tx) => {
    await tx
      .update(supplierProcurementOrders)
      .set({
        approvedAt: input.status === "approved" ? input.now : order.approvedAt,
        approvedBy:
          input.status === "approved" ? input.actorId : order.approvedBy,
        cancelledAt:
          input.status === "cancelled" ? input.now : order.cancelledAt,
        notes: input.notes ?? order.notes,
        orderedAt: input.status === "ordered" ? input.now : order.orderedAt,
        status: input.status,
        updatedAt: input.now,
      })
      .where(eq(supplierProcurementOrders.id, order.id));
    if (input.status === "approved") {
      await tx
        .update(supplierProcurementOrderLines)
        .set({
          approvedQuantity: requestedQuantitySql(),
          updatedAt: input.now,
        })
        .where(eq(supplierProcurementOrderLines.orderId, order.id));
    }
    await insertSupplierTransaction(tx, {
      actorId: input.actorId,
      description: procurementStatusDescription(input.status),
      now: input.now,
      reference: input.reference,
      status: input.status,
      supplierId: supplier.id,
      transactionType: "purchase_order",
    });
  });

  return input.reader.getSupplier(input.supplierSlug);
}

async function findOrder(
  db: ApiDatabase,
  supplierId: string,
  reference: string,
) {
  const [order] = await db
    .select()
    .from(supplierProcurementOrders)
    .where(
      and(
        eq(supplierProcurementOrders.supplierId, supplierId),
        eq(supplierProcurementOrders.reference, reference),
      ),
    )
    .limit(1);
  return order ?? null;
}
