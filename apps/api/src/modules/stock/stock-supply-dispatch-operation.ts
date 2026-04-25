import {
  goodsTransferNotes,
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
  type SkuSnapshot,
  type StockSupplyOperationContext,
} from "./stock-supply-operation-context.js";
import { confirmSupplyRequestStockReservation } from "./stock-supply-reservation-sync.js";
import { syncTransferLifecycle } from "./stock-transfer-lifecycle.js";

export async function dispatchStockSupply(
  input: {
    actor: AuthenticatedActor;
    dispatchedBy: string;
    notes: string | null;
    now: Date;
    supplyRequestId: string;
  },
  context: StockSupplyOperationContext,
): Promise<{
  gtn: GtnRow;
  supplyRequest: SupplyRequestRow;
}> {
  const dispatched = await context.db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(stockSupplyRequests)
      .where(
        and(
          eq(stockSupplyRequests.id, input.supplyRequestId),
          eq(stockSupplyRequests.status, "approved"),
        ),
      )
      .for("update")
      .limit(1);

    if (!request) {
      throw new AppError({
        code: "not_found",
        detail: "Supply request not found or is not in an approved state.",
        statusCode: 404,
        title: "Cannot dispatch",
      });
    }

    const supplyRequest = toSupplyRequestRow(
      request,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    );
    const quantity = getApprovedQuantity(request.approvedQuantity);
    await confirmSupplyRequestStockReservation(tx, {
      actorUserId: input.dispatchedBy,
      now: input.now,
      supplyRequest,
    });
    await recordSourceTransferMovement(tx, {
      dispatchedBy: input.dispatchedBy,
      now: input.now,
      quantity,
      request,
    });

    const gtnReference = await context.referenceNumberService.generateReference(
      {
        now: input.now,
        sequenceKey: "gtn",
      },
    );
    await createGoodsTransferNote(tx, {
      gtnReference,
      notes: input.notes,
      now: input.now,
      quantity,
      request,
      userId: input.dispatchedBy,
    });

    const [updatedRequest] = await tx
      .update(stockSupplyRequests)
      .set({
        dispatchedAt: input.now,
        dispatchedBy: input.dispatchedBy,
        status: "dispatched",
        updatedAt: input.now,
      })
      .where(eq(stockSupplyRequests.id, request.id))
      .returning();
    if (!updatedRequest) throw new Error("Failed to update supply request.");

    const updatedSupplyRequestRow = toSupplyRequestRow(
      updatedRequest,
      null,
      null,
      null,
      null,
      null,
      "confirmed",
      gtnReference,
    );
    const transferReference = await syncTransferLifecycle(tx, {
      actorUserId: input.actor.userId,
      eventType: "dispatched",
      occurredAt: input.now,
      supplyRequest: updatedSupplyRequestRow,
    });
    const updatedSupplyRequest = {
      ...updatedSupplyRequestRow,
      transferReference,
    };
    await appendStockSupplyEventWithinTransaction(context, tx, {
      actor: input.actor,
      payload: { gtnReference },
      supplyRequest: updatedSupplyRequest,
      summary: formatStockSupplyEventSummary({
        action: "dispatched",
        gtnReference,
        supplyRequest: updatedSupplyRequest,
      }),
      type: "transfer.dispatched",
    });

    return { gtnReference, transferReference, updatedRequest };
  });

  await notifyStockSupplyEventsCommitted(context);
  const gtnRow = await context.repository.findGtnBySupplyRequest(
    dispatched.updatedRequest.id,
  );
  if (!gtnRow) throw new Error("GTN not found after creation.");

  return {
    gtn: gtnRow,
    supplyRequest: toSupplyRequestRow(
      dispatched.updatedRequest,
      null,
      null,
      null,
      null,
      dispatched.transferReference,
      "confirmed",
      dispatched.gtnReference,
    ),
  };
}

function getApprovedQuantity(approvedQuantity: number | null) {
  if (!approvedQuantity) {
    throw new AppError({
      code: "internal_error",
      detail: "Approved quantity is missing on an approved request.",
      statusCode: 500,
      title: "Internal error",
    });
  }

  return approvedQuantity;
}

async function recordSourceTransferMovement(
  tx: Parameters<
    Parameters<StockSupplyOperationContext["db"]["transaction"]>[0]
  >[0],
  input: {
    dispatchedBy: string;
    now: Date;
    quantity: number;
    request: typeof stockSupplyRequests.$inferSelect;
  },
) {
  await tx.insert(stockMovements).values({
    createdAt: input.now,
    createdBy: input.dispatchedBy,
    locationId: input.request.sourceLocationId,
    movementType: "transfer_out",
    occurredAt: input.now,
    quantityDelta: -input.quantity,
    skuId: input.request.skuId,
    sourceKey: input.request.id,
    sourceType: "supply_request",
  });
}

async function createGoodsTransferNote(
  tx: Parameters<
    Parameters<StockSupplyOperationContext["db"]["transaction"]>[0]
  >[0],
  input: {
    gtnReference: string;
    notes: string | null;
    now: Date;
    quantity: number;
    request: typeof stockSupplyRequests.$inferSelect;
    userId: string;
  },
) {
  const [gtn] = await tx
    .insert(goodsTransferNotes)
    .values({
      createdAt: input.now,
      destinationLocationId: input.request.locationId,
      dispatchedAt: input.now,
      dispatchedBy: input.userId,
      notes: input.notes,
      quantity: input.quantity,
      reference: input.gtnReference,
      skuId: input.request.skuId,
      skuSnapshot: input.request.skuSnapshot as SkuSnapshot,
      sourceLocationId: input.request.sourceLocationId,
      status: "dispatched",
      supplyRequestId: input.request.id,
      updatedAt: input.now,
    })
    .returning();

  if (!gtn) throw new Error("Failed to create GTN.");
}
