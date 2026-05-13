import type { AdminSupplierProcurementReceiveRequest } from "@shop/contracts";
import {
  supplierProcurementOrderLines,
  supplierProcurementOrders,
} from "@shop/database";
import { and, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { createPostgresStockMovementSyncTransaction } from "../stock/postgres-stock-movement-sync-transaction.js";
import { StockMovementSyncService } from "../stock/stock-movement-sync.service.js";
import {
  findSupplier,
  insertSupplierTransaction,
  invalidProcurementTransition,
  missingVariant,
  resolveLinkedSupplierVariants,
  resolveReceivedStatus,
} from "./postgres-admin-supplier-procurement-write.support.js";
import type { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import {
  assertUniqueReceiptVariants,
  calculateReceiptDelta,
  missingProcurementLine,
  missingReceiptDestination,
  receiptMovementSourceKey,
} from "./supplier-procurement-receipt-rules.js";

const RECEIPT_SOURCE_TYPE = "supplier_procurement_receipt";

type ProcurementTransaction = Parameters<
  Parameters<ApiDatabase["transaction"]>[0]
>[0];

type ReceiptLineRow = Pick<
  typeof supplierProcurementOrderLines.$inferSelect,
  "approvedQuantity" | "id" | "receivedQuantity" | "requestedQuantity" | "skuId"
>;

export async function receiveSupplierProcurementOrder(input: {
  actorId: string;
  db: ApiDatabase;
  lines: AdminSupplierProcurementReceiveRequest["lines"];
  notes: string | null;
  now: Date;
  reader: PostgresAdminSupplierQueryRepository;
  reference: string;
  supplierSlug: string;
}) {
  assertUniqueReceiptVariants(input.lines);
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;
  const variantIds = await resolveLinkedSupplierVariants(input.db, {
    supplierId: supplier.id,
    variantSlugs: input.lines.map((line) => line.variantSlug),
  });

  const result = await input.db.transaction(
    async (tx) => {
      const order = await findReceivableOrderForUpdate(
        tx,
        supplier.id,
        input.reference,
      );
      if (!order) return { found: false as const };
      if (!["ordered", "partially_received"].includes(order.status)) {
        throw invalidProcurementTransition(order.status, "receive");
      }

      const receiptLines = await findReceiptLinesForUpdate(tx, {
        orderId: order.id,
        skuIds: [...variantIds.values()],
      });
      const stockSync = new StockMovementSyncService({
        async withTransaction(callback) {
          return callback(createPostgresStockMovementSyncTransaction(tx));
        },
      });
      let totalDelta = 0;

      for (const line of input.lines) {
        const skuId =
          variantIds.get(line.variantSlug) ?? missingVariant(line.variantSlug);
        const receiptLine =
          receiptLines.get(skuId) ?? missingProcurementLine(line.variantSlug);
        const delta = calculateReceiptDelta({
          expectedQuantity:
            receiptLine.approvedQuantity ?? receiptLine.requestedQuantity,
          previousReceivedQuantity: receiptLine.receivedQuantity,
          receivedQuantity: line.receivedQuantity,
          variantSlug: line.variantSlug,
        });

        if (delta === 0) continue;
        if (!order.destinationLocationId) {
          throw missingReceiptDestination(input.reference);
        }

        await stockSync.syncMovement({
          createdBy: input.actorId,
          locationId: order.destinationLocationId,
          movementType: "goods_receipt",
          now: input.now,
          occurredAt: input.now,
          quantityDelta: delta,
          skuId,
          sourceKey: receiptMovementSourceKey({
            lineId: receiptLine.id,
            receivedQuantity: line.receivedQuantity,
            reference: input.reference,
          }),
          sourceType: RECEIPT_SOURCE_TYPE,
        });
        await updateReceiptLine(tx, {
          lineId: receiptLine.id,
          now: input.now,
          receivedQuantity: line.receivedQuantity,
        });
        totalDelta += delta;
      }

      const status = await resolveReceivedStatus(tx, order.id);
      if (totalDelta > 0 || input.notes !== null) {
        await updateReceiptOrder(tx, {
          notes: input.notes ?? order.notes,
          now: input.now,
          orderId: order.id,
          receivedAt: status === "received" ? input.now : order.receivedAt,
          status,
        });
      }
      if (totalDelta > 0) {
        await insertSupplierTransaction(tx, {
          actorId: input.actorId,
          description: "Supplier goods receipt recorded.",
          now: input.now,
          reference: input.reference,
          status,
          supplierId: supplier.id,
          transactionType: "goods_receipt",
        });
      }
      return { found: true as const };
    },
    { isolationLevel: "serializable" },
  );

  return result.found ? input.reader.getSupplier(input.supplierSlug) : null;
}

async function findReceivableOrderForUpdate(
  tx: ProcurementTransaction,
  supplierId: string,
  reference: string,
) {
  const [order] = await tx
    .select()
    .from(supplierProcurementOrders)
    .where(
      and(
        eq(supplierProcurementOrders.supplierId, supplierId),
        eq(supplierProcurementOrders.reference, reference),
      ),
    )
    .for("update")
    .limit(1);
  return order ?? null;
}

async function findReceiptLinesForUpdate(
  tx: ProcurementTransaction,
  input: { orderId: string; skuIds: string[] },
) {
  const rows: ReceiptLineRow[] = await tx
    .select({
      approvedQuantity: supplierProcurementOrderLines.approvedQuantity,
      id: supplierProcurementOrderLines.id,
      receivedQuantity: supplierProcurementOrderLines.receivedQuantity,
      requestedQuantity: supplierProcurementOrderLines.requestedQuantity,
      skuId: supplierProcurementOrderLines.skuId,
    })
    .from(supplierProcurementOrderLines)
    .where(
      and(
        eq(supplierProcurementOrderLines.orderId, input.orderId),
        inArray(supplierProcurementOrderLines.skuId, input.skuIds),
      ),
    )
    .for("update");
  return new Map(rows.map((row) => [row.skuId, row]));
}

async function updateReceiptLine(
  tx: ProcurementTransaction,
  input: { lineId: string; now: Date; receivedQuantity: number },
) {
  await tx
    .update(supplierProcurementOrderLines)
    .set({
      receivedQuantity: input.receivedQuantity,
      updatedAt: input.now,
    })
    .where(eq(supplierProcurementOrderLines.id, input.lineId));
}

async function updateReceiptOrder(
  tx: ProcurementTransaction,
  input: {
    notes: string | null;
    now: Date;
    orderId: string;
    receivedAt: Date | null;
    status: "ordered" | "partially_received" | "received";
  },
) {
  await tx
    .update(supplierProcurementOrders)
    .set({
      notes: input.notes,
      receivedAt: input.receivedAt,
      status: input.status,
      updatedAt: input.now,
    })
    .where(eq(supplierProcurementOrders.id, input.orderId));
}
