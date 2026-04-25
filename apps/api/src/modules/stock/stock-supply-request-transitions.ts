import { stockSupplyRequests } from "@shop/database";
import { and, eq, inArray } from "drizzle-orm";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { SupplyRequestRow } from "./postgres-supply-request.repository.js";
import { toSupplyRequestRow } from "./postgres-supply-request-mappers.js";
import { formatStockSupplyEventSummary } from "./stock-supply-event-summary.js";
import {
  appendStockSupplyEventWithinTransaction,
  notifyStockSupplyEventsCommitted,
  type StockSupplyOperationContext,
} from "./stock-supply-operation-context.js";
import {
  releaseSupplyRequestStockReservation,
  reserveApprovedSupplyRequestStock,
} from "./stock-supply-reservation-sync.js";
import { syncTransferLifecycle } from "./stock-transfer-lifecycle.js";

type SupplyRequestRecord = typeof stockSupplyRequests.$inferSelect;

export async function transitionPendingStockSupplyRequest(
  context: StockSupplyOperationContext,
  input: {
    actor: AuthenticatedActor;
    id: string;
    now: Date;
    patch: Partial<SupplyRequestRecord>;
    summaryVerb: string;
    type: string;
  },
): Promise<SupplyRequestRow | null> {
  const result = await context.db.transaction(async (tx) => {
    const [row] = await tx
      .update(stockSupplyRequests)
      .set({ ...input.patch, updatedAt: input.now })
      .where(
        and(
          eq(stockSupplyRequests.id, input.id),
          eq(stockSupplyRequests.status, "pending"),
        ),
      )
      .returning();
    if (!row) return null;

    const supplyRequest = toServiceSupplyRequestRow(row);
    if (input.type === "transfer.approved") {
      await reserveApprovedSupplyRequestStock(tx, {
        actorUserId: input.actor.userId,
        now: input.now,
        supplyRequest,
      });
    }
    if (input.type === "transfer.rejected") {
      await releaseSupplyRequestStockReservation(tx, {
        now: input.now,
        reason: "request_rejected",
        supplyRequest,
      });
    }
    const transferReference = await syncTransferLifecycle(tx, {
      actorUserId: input.actor.userId,
      eventType: toTransferEventType(input.type),
      occurredAt: input.now,
      supplyRequest,
    });
    const updatedSupplyRequest = {
      ...supplyRequest,
      sourceReservationStatus:
        input.type === "transfer.approved" ? ("active" as const) : null,
      transferReference,
    };
    await appendStockSupplyEventWithinTransaction(context, tx, {
      actor: input.actor,
      supplyRequest: updatedSupplyRequest,
      summary: formatStockSupplyEventSummary({
        action: toStockSupplyEventAction(input.summaryVerb),
        supplyRequest: updatedSupplyRequest,
      }),
      type: input.type,
    });
    return updatedSupplyRequest;
  });

  await notifyStockSupplyEventsCommitted(context);
  return result;
}

export async function cancelMatchingStockSupplyRequest(
  context: StockSupplyOperationContext,
  input: {
    adminOverrideReason?: string;
    actor: AuthenticatedActor;
    id: string;
    now: Date;
    requesterId?: string;
  },
): Promise<SupplyRequestRow | null> {
  const result = await context.db.transaction(async (tx) => {
    const conditions = [
      eq(stockSupplyRequests.id, input.id),
      inArray(stockSupplyRequests.status, ["pending", "approved"]),
    ];
    if (input.requesterId) {
      conditions.push(eq(stockSupplyRequests.requesterId, input.requesterId));
    }

    const [row] = await tx
      .update(stockSupplyRequests)
      .set({ status: "cancelled", updatedAt: input.now })
      .where(and(...conditions))
      .returning();
    if (!row) return null;

    const supplyRequest = toServiceSupplyRequestRow(row);
    await releaseSupplyRequestStockReservation(tx, {
      now: input.now,
      reason: "request_cancelled",
      supplyRequest,
    });
    const transferReference = await syncTransferLifecycle(tx, {
      actorUserId: input.actor.userId,
      eventType: "cancelled",
      occurredAt: input.now,
      supplyRequest,
    });
    const updatedSupplyRequest = {
      ...supplyRequest,
      sourceReservationStatus: null,
      transferReference,
    };
    await appendStockSupplyEventWithinTransaction(context, tx, {
      actor: input.actor,
      payload: {
        adminOverrideReason: input.adminOverrideReason ?? null,
      },
      supplyRequest: updatedSupplyRequest,
      summary: formatStockSupplyEventSummary({
        action: "cancelled",
        adminOverrideReason: input.adminOverrideReason ?? null,
        supplyRequest: updatedSupplyRequest,
      }),
      type: "transfer.cancelled",
    });
    return updatedSupplyRequest;
  });

  await notifyStockSupplyEventsCommitted(context);
  return result;
}

function toServiceSupplyRequestRow(row: SupplyRequestRecord): SupplyRequestRow {
  return toSupplyRequestRow(row, null, null, null, null, null, null, null);
}

function toStockSupplyEventAction(summaryVerb: string) {
  if (summaryVerb === "approved" || summaryVerb === "rejected") {
    return summaryVerb;
  }

  throw new Error(
    `Unsupported stock supply event summary verb: ${summaryVerb}`,
  );
}

function toTransferEventType(type: string) {
  switch (type) {
    case "transfer.approved":
      return "approved" as const;
    case "transfer.rejected":
      return "rejected" as const;
    default:
      throw new Error(`Unsupported transfer event type: ${type}`);
  }
}
