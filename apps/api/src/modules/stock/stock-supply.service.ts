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

      if (!row) throw new Error("Failed to create supply request.");
      const supplyRequest = toServiceSupplyRequestRow(row);
      await appendStockSupplyEventWithinTransaction(
        this.operationContext(),
        tx,
        {
          actor: input.actor,
          supplyRequest,
          summary: `${supplyRequest.reference} was requested.`,
          type: "transfer.requested",
        },
      );
      return supplyRequest;
    });

    await notifyStockSupplyEventsCommitted(this.operationContext());
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
    id: string;
    now: Date;
    requesterId: string;
  }): Promise<SupplyRequestRow | null> {
    return cancelMatchingStockSupplyRequest(this.operationContext(), {
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
  gtnReference: string | null = null,
): SupplyRequestRow {
  return toSupplyRequestRow(row, null, null, null, null, gtnReference);
}
