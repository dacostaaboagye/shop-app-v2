import {
  goodsTransferNotes,
  stockBalances,
  stockMovements,
  stockSupplyRequests,
} from "@shop/database";
import { and, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { PlatformEventAppendDatabase } from "../events/postgres-platform-event.repository.js";
import type { PlatformEventPipelinePublisher } from "../events/platform-event-pipeline.publisher.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type { GtnRow, SupplyRequestRow } from "./postgres-supply-request.repository.js";
import { PostgresSupplyRequestRepository } from "./postgres-supply-request.repository.js";
import { createStockSupplyEvent } from "./stock-supply-event-publisher.js";

type SkuSnapshot = { sku: string; productName: string; variantName: string };
type SupplyRequestRecord = typeof stockSupplyRequests.$inferSelect;
type TransactionalEventPublisher = Pick<
  PlatformEventPipelinePublisher,
  "appendWithinTransaction" | "notifyAppendCommitted"
>;

export class StockSupplyService {
  private readonly repository: PostgresSupplyRequestRepository;

  constructor(
    private readonly db: ApiDatabase,
    private readonly referenceNumberService: ReferenceNumberService,
    private readonly eventPublisher?: TransactionalEventPublisher,
  ) {
    this.repository = new PostgresSupplyRequestRepository(db);
  }

  async createRequest(input: {
    actor: AuthenticatedActor;
    locationId: string;
    notes: string | null;
    reference: string;
    requestedQuantity: number;
    requesterId: string;
    skuId: string;
    skuSnapshot: SkuSnapshot;
    sourceLocationId: string;
  }): Promise<SupplyRequestRow> {
    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(stockSupplyRequests)
        .values({
          locationId: input.locationId,
          notes: input.notes,
          reference: input.reference,
          requestedQuantity: input.requestedQuantity,
          requesterId: input.requesterId,
          skuId: input.skuId,
          skuSnapshot: input.skuSnapshot,
          sourceLocationId: input.sourceLocationId,
          status: "pending",
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create supply request.");
      }

      const supplyRequest = toSupplyRequestRow(row);
      await this.appendEventWithinTransaction(tx, {
        actor: input.actor,
        supplyRequest,
        summary: `${supplyRequest.reference} was requested.`,
        type: "transfer.requested",
      });

      return supplyRequest;
    });

    await this.notifyEventsCommitted();
    return result;
  }

  async approve(input: {
    actor: AuthenticatedActor;
    approvedQuantity: number;
    id: string;
    now: Date;
    resolutionNotes: string | null;
    resolvedBy: string;
  }): Promise<SupplyRequestRow | null> {
    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(stockSupplyRequests)
        .set({
          approvedQuantity: input.approvedQuantity,
          resolutionNotes: input.resolutionNotes,
          resolvedAt: input.now,
          resolvedBy: input.resolvedBy,
          status: "approved",
          updatedAt: input.now,
        })
        .where(
          and(
            eq(stockSupplyRequests.id, input.id),
            eq(stockSupplyRequests.status, "pending"),
          ),
        )
        .returning();

      if (!row) {
        return null;
      }

      const supplyRequest = toSupplyRequestRow(row);
      await this.appendEventWithinTransaction(tx, {
        actor: input.actor,
        supplyRequest,
        summary: `${supplyRequest.reference} was approved.`,
        type: "transfer.approved",
      });

      return supplyRequest;
    });

    await this.notifyEventsCommitted();
    return result;
  }

  async reject(input: {
    actor: AuthenticatedActor;
    id: string;
    now: Date;
    resolutionNotes: string | null;
    resolvedBy: string;
  }): Promise<SupplyRequestRow | null> {
    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(stockSupplyRequests)
        .set({
          resolutionNotes: input.resolutionNotes,
          resolvedAt: input.now,
          resolvedBy: input.resolvedBy,
          status: "rejected",
          updatedAt: input.now,
        })
        .where(
          and(
            eq(stockSupplyRequests.id, input.id),
            eq(stockSupplyRequests.status, "pending"),
          ),
        )
        .returning();

      if (!row) {
        return null;
      }

      const supplyRequest = toSupplyRequestRow(row);
      await this.appendEventWithinTransaction(tx, {
        actor: input.actor,
        supplyRequest,
        summary: `${supplyRequest.reference} was rejected.`,
        type: "transfer.rejected",
      });

      return supplyRequest;
    });

    await this.notifyEventsCommitted();
    return result;
  }

  async cancel(input: {
    actor: AuthenticatedActor;
    id: string;
    now: Date;
    requesterId: string;
  }): Promise<SupplyRequestRow | null> {
    return this.cancelMatching({
      actor: input.actor,
      id: input.id,
      now: input.now,
      requesterId: input.requesterId,
    });
  }

  async cancelById(input: {
    actor: AuthenticatedActor;
    id: string;
    now: Date;
  }): Promise<SupplyRequestRow | null> {
    return this.cancelMatching({
      actor: input.actor,
      id: input.id,
      now: input.now,
    });
  }

  private async cancelMatching(input: {
    actor: AuthenticatedActor;
    id: string;
    now: Date;
    requesterId?: string;
  }): Promise<SupplyRequestRow | null> {
    const result = await this.db.transaction(async (tx) => {
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

      if (!row) {
        return null;
      }

      const supplyRequest = toSupplyRequestRow(row);
      await this.appendEventWithinTransaction(tx, {
        actor: input.actor,
        supplyRequest,
        summary: `${supplyRequest.reference} was cancelled.`,
        type: "transfer.cancelled",
      });

      return supplyRequest;
    });

    await this.notifyEventsCommitted();
    return result;
  }

  /**
   * Source location manager dispatches goods.
   * - Verifies supply request is in 'approved' state
   * - Checks available stock at source (on_hand - reserved >= approved_quantity)
   * - Deducts from source stock balance (transfer_out movement)
   * - Creates the Goods Transfer Note
   * - Updates supply request status to 'dispatched'
   */
  async dispatch(input: {
    actor: AuthenticatedActor;
    supplyRequestId: string;
    dispatchedBy: string;
    notes: string | null;
    now: Date;
  }): Promise<{ supplyRequest: SupplyRequestRow; gtn: GtnRow }> {
    const dispatched = await this.db.transaction(async (tx) => {
      // 1. Lock and fetch the supply request
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

      if (!request.approvedQuantity) {
        throw new AppError({
          code: "internal_error",
          detail: "Approved quantity is missing on an approved request.",
          statusCode: 500,
          title: "Internal error",
        });
      }

      const qty = request.approvedQuantity;

      // 2. Lock source stock balance and verify available stock
      const [balance] = await tx
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.skuId, request.skuId),
            eq(stockBalances.locationId, request.sourceLocationId),
          ),
        )
        .for("update")
        .limit(1);

      const available = (balance?.onHandQuantity ?? 0) - (balance?.reservedQuantity ?? 0);

      if (available < qty) {
        throw new AppError({
          code: "conflict",
          detail: `Source location only has ${available} units available (${qty} approved). Update or cancel this request.`,
          statusCode: 409,
          title: "Insufficient stock at source",
        });
      }

      // 3. Deduct from source stock balance
      if (!balance) {
        throw new AppError({
          code: "conflict",
          detail: "No stock balance record exists at the source location for this SKU.",
          statusCode: 409,
          title: "No stock record",
        });
      }

      await tx
        .update(stockBalances)
        .set({
          onHandQuantity: balance.onHandQuantity - qty,
          updatedAt: input.now,
        })
        .where(eq(stockBalances.id, balance.id));

      // 4. Record transfer_out movement at source
      await tx.insert(stockMovements).values({
        skuId: request.skuId,
        locationId: request.sourceLocationId,
        movementType: "transfer_out",
        sourceType: "supply_request",
        sourceKey: request.id,
        quantityDelta: -qty,
        occurredAt: input.now,
        createdBy: input.dispatchedBy,
        createdAt: input.now,
      });

      // 5. Generate GTN reference and create the note
      const gtnReference = await this.referenceNumberService.generateReference({
        sequenceKey: "gtn",
        now: input.now,
      });

      const [gtn] = await tx
        .insert(goodsTransferNotes)
        .values({
          reference: gtnReference,
          supplyRequestId: request.id,
          sourceLocationId: request.sourceLocationId,
          destinationLocationId: request.locationId,
          skuId: request.skuId,
          skuSnapshot: request.skuSnapshot as SkuSnapshot,
          quantity: qty,
          status: "dispatched",
          dispatchedBy: input.dispatchedBy,
          dispatchedAt: input.now,
          notes: input.notes,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();

      if (!gtn) throw new Error("Failed to create GTN.");

      // 6. Update supply request to dispatched
      const [updatedRequest] = await tx
        .update(stockSupplyRequests)
        .set({
          status: "dispatched",
          dispatchedBy: input.dispatchedBy,
          dispatchedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(stockSupplyRequests.id, request.id))
        .returning();

      if (!updatedRequest) throw new Error("Failed to update supply request.");

      const supplyRequest = toSupplyRequestRow(updatedRequest, gtnReference);
      await this.appendEventWithinTransaction(tx, {
        actor: input.actor,
        payload: { gtnReference },
        supplyRequest,
        summary: `${supplyRequest.reference} was dispatched.`,
        type: "transfer.dispatched",
      });

      return { gtnReference, updatedRequest };
    });

    await this.notifyEventsCommitted();

    // Query with relations after the transaction has committed so the main
    // pool connection can see the newly inserted GTN.
    const gtnRow = await this.repository.findGtnBySupplyRequest(dispatched.updatedRequest.id);
    if (!gtnRow) throw new Error("GTN not found after creation.");

    return {
      supplyRequest: {
        id: dispatched.updatedRequest.id,
        reference: dispatched.updatedRequest.reference,
        requesterId: dispatched.updatedRequest.requesterId,
        requesterName: null,
        requesterEmail: null,
        locationId: dispatched.updatedRequest.locationId,
        locationName: null,
        sourceLocationId: dispatched.updatedRequest.sourceLocationId,
        sourceLocationName: null,
        skuId: dispatched.updatedRequest.skuId,
        skuSnapshot: dispatched.updatedRequest.skuSnapshot as SkuSnapshot,
        requestedQuantity: dispatched.updatedRequest.requestedQuantity,
        approvedQuantity: dispatched.updatedRequest.approvedQuantity,
        status: dispatched.updatedRequest.status,
        notes: dispatched.updatedRequest.notes,
        resolutionNotes: dispatched.updatedRequest.resolutionNotes,
        resolvedBy: dispatched.updatedRequest.resolvedBy,
        resolvedAt: dispatched.updatedRequest.resolvedAt,
        dispatchedBy: dispatched.updatedRequest.dispatchedBy,
        dispatchedAt: dispatched.updatedRequest.dispatchedAt,
        receivedAt: dispatched.updatedRequest.receivedAt,
        gtnReference: dispatched.gtnReference,
        createdAt: dispatched.updatedRequest.createdAt,
      },
      gtn: gtnRow,
    };
  }

  /**
   * Requesting worker confirms receipt of goods.
   * - Verifies supply request is in 'dispatched' state
   * - Adds to destination stock balance (transfer_in movement)
   * - Updates GTN status to 'received'
   * - Updates supply request status to 'received'
   */
  async confirmReceipt(input: {
    actor: AuthenticatedActor;
    supplyRequestId: string;
    receivedBy: string;
    notes: string | null;
    now: Date;
  }): Promise<{ supplyRequest: SupplyRequestRow; gtn: GtnRow }> {
    const received = await this.db.transaction(async (tx) => {
      // 1. Lock and fetch the supply request
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
          detail: "Supply request not found or goods have not been dispatched yet.",
          statusCode: 404,
          title: "Cannot confirm receipt",
        });
      }

      const qty = request.approvedQuantity!;

      // 2. Add to destination stock balance (upsert)
      const [existingBalance] = await tx
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.skuId, request.skuId),
            eq(stockBalances.locationId, request.locationId),
          ),
        )
        .for("update")
        .limit(1);

      if (existingBalance) {
        await tx
          .update(stockBalances)
          .set({
            onHandQuantity: existingBalance.onHandQuantity + qty,
            updatedAt: input.now,
            updatedBy: input.receivedBy,
          })
          .where(eq(stockBalances.id, existingBalance.id));
      } else {
        await tx.insert(stockBalances).values({
          skuId: request.skuId,
          locationId: request.locationId,
          onHandQuantity: qty,
          reservedQuantity: 0,
          updatedBy: input.receivedBy,
          createdAt: input.now,
          updatedAt: input.now,
        });
      }

      // 3. Record transfer_in movement at destination
      await tx.insert(stockMovements).values({
        skuId: request.skuId,
        locationId: request.locationId,
        movementType: "transfer_in",
        sourceType: "supply_request",
        sourceKey: request.id,
        quantityDelta: qty,
        occurredAt: input.now,
        createdBy: input.receivedBy,
        createdAt: input.now,
      });

      // 4. Update GTN to received
      const [existingGtn] = await tx
        .select({ id: goodsTransferNotes.id, reference: goodsTransferNotes.reference })
        .from(goodsTransferNotes)
        .where(eq(goodsTransferNotes.supplyRequestId, request.id))
        .limit(1);

      if (existingGtn) {
        await tx
          .update(goodsTransferNotes)
          .set({
            status: "received",
            receivedBy: input.receivedBy,
            receivedAt: input.now,
            notes: input.notes ?? undefined,
            updatedAt: input.now,
          })
          .where(eq(goodsTransferNotes.id, existingGtn.id));
      }

      // 5. Update supply request to received
      const [updatedRequest] = await tx
        .update(stockSupplyRequests)
        .set({
          status: "received",
          receivedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(stockSupplyRequests.id, request.id))
        .returning();

      if (!updatedRequest) throw new Error("Failed to update supply request.");

      const supplyRequest = toSupplyRequestRow(updatedRequest);
      await this.appendEventWithinTransaction(tx, {
        actor: input.actor,
        payload: {
          gtnReference: existingGtn?.reference ?? null,
        },
        supplyRequest,
        summary: `${supplyRequest.reference} was received.`,
        type: "transfer.received",
      });

      return { requestId: request.id, updatedRequest };
    });

    await this.notifyEventsCommitted();

    // Query with relations after the transaction has committed so the main
    // pool connection can see the updated GTN status.
    const gtnRow = await this.repository.findGtnBySupplyRequest(received.requestId);
    if (!gtnRow) throw new Error("GTN not found after receipt confirmation.");

    return {
      supplyRequest: {
        id: received.updatedRequest.id,
        reference: received.updatedRequest.reference,
        requesterId: received.updatedRequest.requesterId,
        requesterName: null,
        requesterEmail: null,
        locationId: received.updatedRequest.locationId,
        locationName: null,
        sourceLocationId: received.updatedRequest.sourceLocationId,
        sourceLocationName: null,
        skuId: received.updatedRequest.skuId,
        skuSnapshot: received.updatedRequest.skuSnapshot as SkuSnapshot,
        requestedQuantity: received.updatedRequest.requestedQuantity,
        approvedQuantity: received.updatedRequest.approvedQuantity,
        status: received.updatedRequest.status,
        notes: received.updatedRequest.notes,
        resolutionNotes: received.updatedRequest.resolutionNotes,
        resolvedBy: received.updatedRequest.resolvedBy,
        resolvedAt: received.updatedRequest.resolvedAt,
        dispatchedBy: received.updatedRequest.dispatchedBy,
        dispatchedAt: received.updatedRequest.dispatchedAt,
        receivedAt: received.updatedRequest.receivedAt,
        gtnReference: gtnRow.reference,
        createdAt: received.updatedRequest.createdAt,
      },
      gtn: gtnRow,
    };
  }

  private async appendEventWithinTransaction(
    db: PlatformEventAppendDatabase,
    input: {
      actor: AuthenticatedActor;
      payload?: Record<string, string | number | boolean | null>;
      summary: string;
      supplyRequest: SupplyRequestRow;
      type: string;
    },
  ) {
    if (!this.eventPublisher) {
      return;
    }

    await this.eventPublisher.appendWithinTransaction(
      createStockSupplyEvent(input),
      db,
    );
  }

  private async notifyEventsCommitted() {
    await this.eventPublisher?.notifyAppendCommitted();
  }
}

function toSupplyRequestRow(
  row: SupplyRequestRecord,
  gtnReference: string | null = null,
): SupplyRequestRow {
  return {
    approvedQuantity: row.approvedQuantity,
    createdAt: row.createdAt,
    dispatchedAt: row.dispatchedAt,
    dispatchedBy: row.dispatchedBy,
    gtnReference,
    id: row.id,
    locationId: row.locationId,
    locationName: null,
    notes: row.notes,
    receivedAt: row.receivedAt,
    reference: row.reference,
    requesterEmail: null,
    requesterId: row.requesterId,
    requesterName: null,
    requestedQuantity: row.requestedQuantity,
    resolutionNotes: row.resolutionNotes,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
    skuId: row.skuId,
    skuSnapshot: row.skuSnapshot as SkuSnapshot,
    sourceLocationId: row.sourceLocationId,
    sourceLocationName: null,
    status: row.status,
  };
}
