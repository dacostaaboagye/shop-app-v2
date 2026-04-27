import { stockSupplyRequests } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type {
  GtnRow,
  SupplyRequestRow,
} from "./postgres-supply-request.repository.js";
import { PostgresSupplyRequestRepository } from "./postgres-supply-request.repository.js";
import { toSupplyRequestRow } from "./postgres-supply-request-mappers.js";
import { dispatchStockSupply } from "./stock-supply-dispatch-operation.js";
import { formatStockSupplyEventSummary } from "./stock-supply-event-summary.js";
import {
  appendStockSupplyEventWithinTransaction,
  notifyStockSupplyEventsCommitted,
  type SkuSnapshot,
  type StockSupplyOperationContext,
  type TransactionalEventPublisher,
} from "./stock-supply-operation-context.js";
import { confirmStockSupplyReceipt } from "./stock-supply-receipt-operation.js";
import {
  cancelMatchingStockSupplyRequest,
  transitionPendingStockSupplyRequest,
} from "./stock-supply-request-transitions.js";
import { createRequestedTransfer } from "./stock-transfer-lifecycle.js";

type SupplyRequestRecord = typeof stockSupplyRequests.$inferSelect;

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
    const [row] = await this.createRequestBatch({
      actor: input.actor,
      items: [
        {
          reference: input.reference,
          requestedQuantity: input.requestedQuantity,
          skuId: input.skuId,
          skuSnapshot: input.skuSnapshot,
        },
      ],
      locationId: input.locationId,
      notes: input.notes,
      requestGroupReference: null,
      requesterId: input.requesterId,
      sourceLocationId: input.sourceLocationId,
    });

    if (!row) {
      throw new Error("Failed to create supply request.");
    }

    return row;
  }

  async createRequestBatch(input: {
    actor: AuthenticatedActor;
    items: Array<{
      reference: string;
      requestedQuantity: number;
      skuId: string;
      skuSnapshot: SkuSnapshot;
    }>;
    locationId: string;
    notes: string | null;
    requestGroupReference: string | null;
    requesterId: string;
    sourceLocationId: string;
  }): Promise<SupplyRequestRow[]> {
    const transferReferences = await Promise.all(
      input.items.map(() =>
        this.referenceNumberService.generateReference({
          now: new Date(),
          sequenceKey: "stock-transfer",
        }),
      ),
    );

    const rows = await this.db.transaction(async (tx) => {
      const createdRows: SupplyRequestRow[] = [];

      for (const [index, item] of input.items.entries()) {
        const [row] = await tx
          .insert(stockSupplyRequests)
          .values({
            locationId: input.locationId,
            notes: input.notes,
            reference: item.reference,
            requestGroupReference: input.requestGroupReference,
            requestedQuantity: item.requestedQuantity,
            requesterId: input.requesterId,
            skuId: item.skuId,
            skuSnapshot: item.skuSnapshot,
            sourceLocationId: input.sourceLocationId,
            status: "pending",
          })
          .returning();

        if (!row) throw new Error("Failed to create supply request.");

        const supplyRequest = toServiceSupplyRequestRow(
          row,
          transferReferences[index] ?? null,
        );
        await createRequestedTransfer(tx, {
          actorUserId: input.requesterId,
          occurredAt: row.createdAt,
          reference: transferReferences[index] ?? "",
          supplyRequest,
        });
        await appendStockSupplyEventWithinTransaction(
          this.operationContext(),
          tx,
          {
            actor: input.actor,
            supplyRequest,
            summary: formatStockSupplyEventSummary({
              action: "requested",
              supplyRequest,
            }),
            type: "transfer.requested",
          },
        );
        createdRows.push(supplyRequest);
      }

      return createdRows;
    });

    await notifyStockSupplyEventsCommitted(this.operationContext());
    return rows;
  }

  async approve(input: {
    actor: AuthenticatedActor;
    approvedQuantity: number;
    id: string;
    now: Date;
    resolutionNotes: string | null;
    resolvedBy: string;
  }): Promise<SupplyRequestRow | null> {
    return transitionPendingStockSupplyRequest(this.operationContext(), {
      actor: input.actor,
      id: input.id,
      now: input.now,
      patch: {
        approvedQuantity: input.approvedQuantity,
        resolutionNotes: input.resolutionNotes,
        resolvedAt: input.now,
        resolvedBy: input.resolvedBy,
        status: "approved",
      },
      summaryVerb: "approved",
      type: "transfer.approved",
    });
  }

  async reject(input: {
    actor: AuthenticatedActor;
    id: string;
    now: Date;
    resolutionNotes: string | null;
    resolvedBy: string;
  }): Promise<SupplyRequestRow | null> {
    return transitionPendingStockSupplyRequest(this.operationContext(), {
      actor: input.actor,
      id: input.id,
      now: input.now,
      patch: {
        resolutionNotes: input.resolutionNotes,
        resolvedAt: input.now,
        resolvedBy: input.resolvedBy,
        status: "rejected",
      },
      summaryVerb: "rejected",
      type: "transfer.rejected",
    });
  }

  async cancel(input: {
    actor: AuthenticatedActor;
    adminOverrideReason?: string;
    id: string;
    now: Date;
    requesterId: string;
  }): Promise<SupplyRequestRow | null> {
    return cancelMatchingStockSupplyRequest(this.operationContext(), {
      actor: input.actor,
      id: input.id,
      now: input.now,
      requesterId: input.requesterId,
      ...(input.adminOverrideReason
        ? { adminOverrideReason: input.adminOverrideReason }
        : {}),
    });
  }

  async cancelById(input: {
    actor: AuthenticatedActor;
    adminOverrideReason?: string;
    id: string;
    now: Date;
  }): Promise<SupplyRequestRow | null> {
    return cancelMatchingStockSupplyRequest(this.operationContext(), input);
  }

  async dispatch(input: {
    actor: AuthenticatedActor;
    dispatchedBy: string;
    notes: string | null;
    now: Date;
    supplyRequestId: string;
  }): Promise<{ gtn: GtnRow; supplyRequest: SupplyRequestRow }> {
    return dispatchStockSupply(input, this.operationContext());
  }

  async confirmReceipt(input: {
    adminOverrideReason?: string;
    actor: AuthenticatedActor;
    notes: string | null;
    now: Date;
    receivedBy: string;
    supplyRequestId: string;
  }): Promise<{ gtn: GtnRow; supplyRequest: SupplyRequestRow }> {
    return confirmStockSupplyReceipt(input, this.operationContext());
  }

  private operationContext(): StockSupplyOperationContext {
    return {
      db: this.db,
      referenceNumberService: this.referenceNumberService,
      repository: this.repository,
      ...(this.eventPublisher ? { eventPublisher: this.eventPublisher } : {}),
    };
  }
}

function toServiceSupplyRequestRow(
  row: SupplyRequestRecord,
  transferReference: string | null = null,
  sourceReservationStatus:
    | "active"
    | "cancelled"
    | "confirmed"
    | "expired"
    | "released"
    | null = null,
  gtnReference: string | null = null,
): SupplyRequestRow {
  return toSupplyRequestRow(
    row,
    null,
    null,
    null,
    null,
    transferReference,
    sourceReservationStatus,
    gtnReference,
  );
}
