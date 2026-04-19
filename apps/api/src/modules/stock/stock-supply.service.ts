import {
  goodsTransferNotes,
  stockBalances,
  stockMovements,
  stockSupplyRequests,
} from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type { GtnRow, SupplyRequestRow } from "./postgres-supply-request.repository.js";
import { PostgresSupplyRequestRepository } from "./postgres-supply-request.repository.js";

type SkuSnapshot = { sku: string; productName: string; variantName: string };

export class StockSupplyService {
  private readonly repository: PostgresSupplyRequestRepository;

  constructor(
    private readonly db: ApiDatabase,
    private readonly referenceNumberService: ReferenceNumberService,
  ) {
    this.repository = new PostgresSupplyRequestRepository(db);
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
    supplyRequestId: string;
    dispatchedBy: string;
    notes: string | null;
    now: Date;
  }): Promise<{ supplyRequest: SupplyRequestRow; gtn: GtnRow }> {
    return this.db.transaction(async (tx) => {
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

      const gtnRow = await this.repository.findGtnBySupplyRequest(request.id);
      if (!gtnRow) throw new Error("GTN not found after creation.");

      return {
        supplyRequest: {
          id: updatedRequest.id,
          reference: updatedRequest.reference,
          requesterId: updatedRequest.requesterId,
          requesterName: null,
          requesterEmail: null,
          locationId: updatedRequest.locationId,
          locationName: null,
          sourceLocationId: updatedRequest.sourceLocationId,
          sourceLocationName: null,
          skuId: updatedRequest.skuId,
          skuSnapshot: updatedRequest.skuSnapshot as SkuSnapshot,
          requestedQuantity: updatedRequest.requestedQuantity,
          approvedQuantity: updatedRequest.approvedQuantity,
          status: updatedRequest.status,
          notes: updatedRequest.notes,
          resolutionNotes: updatedRequest.resolutionNotes,
          resolvedBy: updatedRequest.resolvedBy,
          resolvedAt: updatedRequest.resolvedAt,
          dispatchedBy: updatedRequest.dispatchedBy,
          dispatchedAt: updatedRequest.dispatchedAt,
          receivedAt: updatedRequest.receivedAt,
          gtnReference,
          createdAt: updatedRequest.createdAt,
        },
        gtn: gtnRow,
      };
    });
  }

  /**
   * Requesting worker confirms receipt of goods.
   * - Verifies supply request is in 'dispatched' state
   * - Adds to destination stock balance (transfer_in movement)
   * - Updates GTN status to 'received'
   * - Updates supply request status to 'received'
   */
  async confirmReceipt(input: {
    supplyRequestId: string;
    receivedBy: string;
    notes: string | null;
    now: Date;
  }): Promise<{ supplyRequest: SupplyRequestRow; gtn: GtnRow }> {
    return this.db.transaction(async (tx) => {
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
        .select({ id: goodsTransferNotes.id })
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

      const gtnRow = await this.repository.findGtnBySupplyRequest(request.id);

      const gtnReference = gtnRow?.reference ?? null;

      return {
        supplyRequest: {
          id: updatedRequest.id,
          reference: updatedRequest.reference,
          requesterId: updatedRequest.requesterId,
          requesterName: null,
          requesterEmail: null,
          locationId: updatedRequest.locationId,
          locationName: null,
          sourceLocationId: updatedRequest.sourceLocationId,
          sourceLocationName: null,
          skuId: updatedRequest.skuId,
          skuSnapshot: updatedRequest.skuSnapshot as SkuSnapshot,
          requestedQuantity: updatedRequest.requestedQuantity,
          approvedQuantity: updatedRequest.approvedQuantity,
          status: updatedRequest.status,
          notes: updatedRequest.notes,
          resolutionNotes: updatedRequest.resolutionNotes,
          resolvedBy: updatedRequest.resolvedBy,
          resolvedAt: updatedRequest.resolvedAt,
          dispatchedBy: updatedRequest.dispatchedBy,
          dispatchedAt: updatedRequest.dispatchedAt,
          receivedAt: updatedRequest.receivedAt,
          gtnReference,
          createdAt: updatedRequest.createdAt,
        },
        gtn: gtnRow!,
      };
    });
  }
}
