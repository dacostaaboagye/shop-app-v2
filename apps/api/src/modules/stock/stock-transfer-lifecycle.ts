import { stockTransferEvents, stockTransfers } from "@shop/database";
import { eq } from "drizzle-orm";
import type { SupplyRequestRow } from "./postgres-supply-request.repository.js";

type TransferEventType =
  | "approved"
  | "cancelled"
  | "dispatched"
  | "received"
  | "rejected"
  | "requested";

type TransferStatus =
  | "approved"
  | "cancelled"
  | "in_transit"
  | "received"
  | "rejected"
  | "requested";

type StockSupplyTx = Parameters<
  Parameters<
    import("../../infrastructure/database.js").ApiDatabase["transaction"]
  >[0]
>[0];

export async function createRequestedTransfer(
  tx: StockSupplyTx,
  input: {
    actorUserId: string;
    occurredAt: Date;
    reference: string;
    supplyRequest: SupplyRequestRow;
  },
) {
  const [transfer] = await tx
    .insert(stockTransfers)
    .values({
      approvedQuantity: input.supplyRequest.approvedQuantity,
      createdAt: input.occurredAt,
      destinationLocationId: input.supplyRequest.locationId,
      lastEventAt: input.occurredAt,
      reference: input.reference,
      requestedBy: input.supplyRequest.requesterId,
      requestedQuantity: input.supplyRequest.requestedQuantity,
      skuId: input.supplyRequest.skuId,
      skuSnapshot: input.supplyRequest.skuSnapshot,
      sourceLocationId: input.supplyRequest.sourceLocationId,
      status: "requested",
      supplyRequestId: input.supplyRequest.id,
      updatedAt: input.occurredAt,
    })
    .returning({ id: stockTransfers.id });

  if (!transfer) {
    throw new Error("Failed to create stock transfer.");
  }

  await appendTransferEvent(tx, {
    actorUserId: input.actorUserId,
    eventType: "requested",
    occurredAt: input.occurredAt,
    summary: `Transfer ${input.reference} requested.`,
    supplyRequest: input.supplyRequest,
    transferId: transfer.id,
  });
}

export async function syncTransferLifecycle(
  tx: StockSupplyTx,
  input: {
    actorUserId: string | null;
    eventType: TransferEventType;
    occurredAt: Date;
    supplyRequest: SupplyRequestRow;
  },
) {
  const transfer = await ensureTransfer(tx, {
    occurredAt: input.occurredAt,
    supplyRequest: input.supplyRequest,
  });

  await tx
    .update(stockTransfers)
    .set({
      approvedQuantity: input.supplyRequest.approvedQuantity,
      lastEventAt: input.occurredAt,
      status: toTransferStatus(input.eventType),
      updatedAt: input.occurredAt,
    })
    .where(eq(stockTransfers.id, transfer.id));

  await appendTransferEvent(tx, {
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    summary: `Transfer ${transfer.reference} ${input.eventType}.`,
    supplyRequest: input.supplyRequest,
    transferId: transfer.id,
  });

  return transfer.reference;
}

async function ensureTransfer(
  tx: StockSupplyTx,
  input: {
    occurredAt: Date;
    supplyRequest: SupplyRequestRow;
  },
) {
  const [existingTransfer] = await tx
    .select({ id: stockTransfers.id, reference: stockTransfers.reference })
    .from(stockTransfers)
    .where(eq(stockTransfers.supplyRequestId, input.supplyRequest.id))
    .limit(1);

  if (existingTransfer) {
    return existingTransfer;
  }

  const [createdTransfer] = await tx
    .insert(stockTransfers)
    .values({
      approvedQuantity: input.supplyRequest.approvedQuantity,
      createdAt: input.supplyRequest.createdAt,
      destinationLocationId: input.supplyRequest.locationId,
      lastEventAt: input.occurredAt,
      reference: deriveLegacyTransferReference(input.supplyRequest.reference),
      requestedBy: input.supplyRequest.requesterId,
      requestedQuantity: input.supplyRequest.requestedQuantity,
      skuId: input.supplyRequest.skuId,
      skuSnapshot: input.supplyRequest.skuSnapshot,
      sourceLocationId: input.supplyRequest.sourceLocationId,
      status: "requested",
      supplyRequestId: input.supplyRequest.id,
      updatedAt: input.occurredAt,
    })
    .returning({ id: stockTransfers.id, reference: stockTransfers.reference });

  if (!createdTransfer) {
    throw new Error("Failed to backfill stock transfer.");
  }

  return createdTransfer;
}

async function appendTransferEvent(
  tx: StockSupplyTx,
  input: {
    actorUserId: string | null;
    eventType: TransferEventType;
    occurredAt: Date;
    summary: string;
    supplyRequest: SupplyRequestRow;
    transferId: string;
  },
) {
  const expectedQuantity =
    input.supplyRequest.approvedQuantity ??
    input.supplyRequest.requestedQuantity;
  const receivedQuantity = input.supplyRequest.receivedQuantity;

  await tx.insert(stockTransferEvents).values({
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    payload: {
      approvedQuantity: input.supplyRequest.approvedQuantity,
      missingQuantity:
        receivedQuantity === null ? null : expectedQuantity - receivedQuantity,
      requestedQuantity: input.supplyRequest.requestedQuantity,
      receivedQuantity,
      receiptDiscrepancyReason: input.supplyRequest.receiptDiscrepancyReason,
      status: input.supplyRequest.status,
    },
    summary: input.summary,
    supplyRequestId: input.supplyRequest.id,
    transferId: input.transferId,
  });
}

function toTransferStatus(eventType: TransferEventType): TransferStatus {
  switch (eventType) {
    case "dispatched":
      return "in_transit";
    default:
      return eventType;
  }
}

function deriveLegacyTransferReference(supplyRequestReference: string) {
  return `TRF-${supplyRequestReference}`;
}
