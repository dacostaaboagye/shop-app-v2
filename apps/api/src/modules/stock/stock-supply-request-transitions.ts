import { stockSupplyRequests } from "@shop/database";
import { and, eq, inArray } from "drizzle-orm";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { SupplyRequestRow } from "./postgres-supply-request.repository.js";
import { toSupplyRequestRow } from "./postgres-supply-request-mappers.js";
import {
  appendStockSupplyEventWithinTransaction,
  notifyStockSupplyEventsCommitted,
  type StockSupplyOperationContext,
} from "./stock-supply-operation-context.js";

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
    await appendStockSupplyEventWithinTransaction(context, tx, {
      actor: input.actor,
      supplyRequest,
      summary: `${supplyRequest.reference} was ${input.summaryVerb}.`,
      type: input.type,
    });
    return supplyRequest;
  });

  await notifyStockSupplyEventsCommitted(context);
  return result;
}

export async function cancelMatchingStockSupplyRequest(
  context: StockSupplyOperationContext,
  input: {
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
    await appendStockSupplyEventWithinTransaction(context, tx, {
      actor: input.actor,
      supplyRequest,
      summary: `${supplyRequest.reference} was cancelled.`,
      type: "transfer.cancelled",
    });
    return supplyRequest;
  });

  await notifyStockSupplyEventsCommitted(context);
  return result;
}

function toServiceSupplyRequestRow(row: SupplyRequestRecord): SupplyRequestRow {
  return toSupplyRequestRow(row, null, null, null, null, null);
}
