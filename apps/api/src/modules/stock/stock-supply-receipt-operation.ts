import {
  goodsTransferNotes,
  stockBalances,
  stockMovements,
  stockSupplyRequests,
} from "@shop/database";
import { and, eq } from "drizzle-orm";
import { AppError } from "../_core/errors/app-error.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type {
  GtnRow,
  SupplyRequestRow,
} from "./postgres-supply-request.repository.js";
import { toSupplyRequestRow } from "./postgres-supply-request-mappers.js";
import { formatStockSupplyEventSummary } from "./stock-supply-event-summary.js";
import {
  appendStockSupplyEventWithinTransaction,
  notifyStockSupplyEventsCommitted,
  type StockSupplyOperationContext,
} from "./stock-supply-operation-context.js";
import { normalizeReceiptInput } from "./stock-supply-receipt-support.js";
import { syncTransferLifecycle } from "./stock-transfer-lifecycle.js";

export async function confirmStockSupplyReceipt(
  input: {
    adminOverrideReason?: string;
    actor: AuthenticatedActor;
    discrepancyNotes?: string;
    discrepancyReason?: string;
    notes: string | null;
    now: Date;
    receivedBy: string;
    receivedQuantity?: number;
    supplyRequestId: string;
  },
  context: StockSupplyOperationContext,
): Promise<{
  gtn: GtnRow;
  supplyRequest: SupplyRequestRow;
}> {
  const received = await context.db.transaction(
    async (tx) => {
      const [request] = await tx
        .select()
        .from(stockSupplyRequests)
        .where(
          and(
            eq(stockSupplyRequests.id, input.supplyRequestId),
            eq(stockSupplyRequests.status, "dispatched"),
          ),
        )
        .for("update")
        .limit(1);

      if (!request) {
        throw new AppError({
          code: "not_found",
          detail:
            "Supply request not found or goods have not been dispatched yet.",
          statusCode: 404,
          title: "Cannot confirm receipt",
        });
      }

      const receipt = normalizeReceiptInput({
        approvedQuantity: request.approvedQuantity ?? 0,
        discrepancyNotes: input.discrepancyNotes,
        discrepancyReason: input.discrepancyReason,
        receivedQuantity: input.receivedQuantity,
      });
      await receiveDestinationStock(tx, {
        now: input.now,
        quantity: receipt.receivedQuantity,
        receivedBy: input.receivedBy,
        request,
      });
      const existingGtn = await markGtnReceived(tx, {
        discrepancyNotes: receipt.discrepancyNotes,
        discrepancyReason: receipt.discrepancyReason,
        notes: input.notes,
        now: input.now,
        receivedBy: input.receivedBy,
        receivedQuantity: receipt.receivedQuantity,
        requestId: request.id,
      });

      const [updatedRequest] = await tx
        .update(stockSupplyRequests)
        .set({
          receivedAt: input.now,
          receivedQuantity: receipt.receivedQuantity,
          receiptDiscrepancyNotes: receipt.discrepancyNotes,
          receiptDiscrepancyReason: receipt.discrepancyReason,
          status: "received",
          updatedAt: input.now,
        })
        .where(eq(stockSupplyRequests.id, request.id))
        .returning();
      if (!updatedRequest) throw new Error("Failed to update supply request.");

      const supplyRequest = toSupplyRequestRow(
        updatedRequest,
        null,
        null,
        null,
        null,
        null,
        "confirmed",
        null,
      );
      const transferReference = await syncTransferLifecycle(tx, {
        actorUserId: input.actor.userId,
        eventType: "received",
        occurredAt: input.now,
        supplyRequest,
      });
      const updatedSupplyRequest = {
        ...supplyRequest,
        transferReference,
      };
      await appendStockSupplyEventWithinTransaction(context, tx, {
        actor: input.actor,
        payload: {
          adminOverrideReason: input.adminOverrideReason ?? null,
          expectedQuantity: receipt.expectedQuantity,
          gtnReference: existingGtn?.reference ?? null,
          missingQuantity: receipt.missingQuantity,
          receivedQuantity: receipt.receivedQuantity,
          receiptDiscrepancyReason: receipt.discrepancyReason,
        },
        supplyRequest: updatedSupplyRequest,
        summary: formatStockSupplyEventSummary({
          action: "received",
          adminOverrideReason: input.adminOverrideReason ?? null,
          gtnReference: existingGtn?.reference ?? null,
          supplyRequest: updatedSupplyRequest,
        }),
        type: "transfer.received",
      });

      return { requestId: request.id, transferReference, updatedRequest };
    },
    { isolationLevel: "serializable" },
  );

  await notifyStockSupplyEventsCommitted(context);
  const gtnRow = await context.repository.findGtnBySupplyRequest(
    received.requestId,
  );
  if (!gtnRow) throw new Error("GTN not found after receipt confirmation.");

  return {
    gtn: gtnRow,
    supplyRequest: toSupplyRequestRow(
      received.updatedRequest,
      null,
      null,
      null,
      null,
      received.transferReference,
      "confirmed",
      gtnRow.reference,
    ),
  };
}

async function receiveDestinationStock(
  tx: Parameters<
    Parameters<StockSupplyOperationContext["db"]["transaction"]>[0]
  >[0],
  input: {
    now: Date;
    quantity: number;
    receivedBy: string;
    request: typeof stockSupplyRequests.$inferSelect;
  },
) {
  if (input.quantity === 0) {
    return;
  }

  const [existingBalance] = await tx
    .select()
    .from(stockBalances)
    .where(
      and(
        eq(stockBalances.skuId, input.request.skuId),
        eq(stockBalances.locationId, input.request.locationId),
      ),
    )
    .for("update")
    .limit(1);

  if (existingBalance) {
    await tx
      .update(stockBalances)
      .set({
        onHandQuantity: existingBalance.onHandQuantity + input.quantity,
        updatedAt: input.now,
        updatedBy: input.receivedBy,
      })
      .where(eq(stockBalances.id, existingBalance.id));
  } else {
    await tx.insert(stockBalances).values({
      createdAt: input.now,
      locationId: input.request.locationId,
      onHandQuantity: input.quantity,
      reservedQuantity: 0,
      skuId: input.request.skuId,
      updatedAt: input.now,
      updatedBy: input.receivedBy,
    });
  }

  await tx.insert(stockMovements).values({
    createdAt: input.now,
    createdBy: input.receivedBy,
    locationId: input.request.locationId,
    movementType: "transfer_in",
    occurredAt: input.now,
    quantityDelta: input.quantity,
    skuId: input.request.skuId,
    sourceKey: input.request.id,
    sourceType: "supply_request",
  });
}

async function markGtnReceived(
  tx: Parameters<
    Parameters<StockSupplyOperationContext["db"]["transaction"]>[0]
  >[0],
  input: {
    discrepancyNotes: string | null;
    discrepancyReason: string | null;
    notes: string | null;
    now: Date;
    receivedBy: string;
    receivedQuantity: number;
    requestId: string;
  },
) {
  const [existingGtn] = await tx
    .select({
      id: goodsTransferNotes.id,
      reference: goodsTransferNotes.reference,
    })
    .from(goodsTransferNotes)
    .where(eq(goodsTransferNotes.supplyRequestId, input.requestId))
    .limit(1);

  if (!existingGtn) {
    return null;
  }

  await tx
    .update(goodsTransferNotes)
    .set({
      notes: input.notes ?? undefined,
      receivedAt: input.now,
      receivedBy: input.receivedBy,
      receivedQuantity: input.receivedQuantity,
      receiptDiscrepancyNotes: input.discrepancyNotes,
      receiptDiscrepancyReason: input.discrepancyReason,
      status: "received",
      updatedAt: input.now,
    })
    .where(eq(goodsTransferNotes.id, existingGtn.id));

  return existingGtn;
}
