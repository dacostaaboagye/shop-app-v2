import {
  manualInvoiceRequestEvents,
  manualInvoiceRequestLines,
  manualInvoiceRequests,
} from "@shop/database";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  manualInvoiceRequestNotFoundError,
  manualInvoiceRequestRelations,
  manualInvoiceRequestStateError,
  mapManualInvoiceRequestRecord,
} from "./manual-invoice-request.repository-support.js";
import type {
  CreateManualInvoiceRequestTransactionInput,
  ManualInvoiceRequestRecord,
  ManualInvoiceRequestRepository,
  ManualInvoiceRequestStatus,
} from "./manual-invoice-request.types.js";
import { insertIssuedInvoice } from "./postgres-issued-invoice.commands.js";

export class PostgresManualInvoiceRequestRepository
  implements ManualInvoiceRequestRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async createRequestTransaction(
    input: CreateManualInvoiceRequestTransactionInput,
  ): Promise<ManualInvoiceRequestRecord> {
    const request = await this.db.transaction(async (tx) => {
      const [requestRow] = await tx
        .insert(manualInvoiceRequests)
        .values({
          createdAt: input.now,
          currencyCode: input.currencyCode,
          currencyScale: input.currencyScale,
          customerBillingAddressLines: input.customerBillingAddressLines,
          customerContactId: input.customerContactId,
          customerEmail: input.customerEmail,
          customerId: input.customerId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerTaxNumber: input.customerTaxNumber,
          locationId: input.locationId,
          paymentMethod: input.paymentMethod,
          reason: input.reason,
          reference: input.reference,
          requestedBy: input.createdBy,
          subtotalAmount: input.subtotalAmount,
          supportingNote: input.supportingNote,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
          updatedAt: input.now,
        })
        .returning();

      if (!requestRow)
        throw new Error("Failed to create manual invoice request.");

      await tx.insert(manualInvoiceRequestLines).values(
        input.lineItems.map((line) => ({
          createdAt: input.now,
          lineTotal: line.lineTotal,
          quantity: line.quantity,
          requestId: requestRow.id,
          skuId: line.skuId,
          skuSnapshot: line.skuSnapshot,
          taxAmount: line.taxAmount,
          taxCategory: line.taxCategory,
          taxRate: line.taxRate,
          unitPrice: line.unitPrice,
          updatedAt: input.now,
        })),
      );

      await tx.insert(manualInvoiceRequestEvents).values({
        action: "submitted",
        actorId: input.createdBy,
        createdAt: input.now,
        note: input.reason,
        requestId: requestRow.id,
      });

      return requestRow;
    });

    return this.findCreatedRequest(request.reference);
  }

  async listByLocations(input: {
    locationIds: readonly string[];
    page: number;
    pageSize: number;
    q?: string;
    status?: ManualInvoiceRequestStatus;
  }): Promise<{ items: ManualInvoiceRequestRecord[]; total: number }> {
    if (input.locationIds.length === 0) return { items: [], total: 0 };

    const conditions = [
      inArray(manualInvoiceRequests.locationId, input.locationIds),
    ];
    if (input.status) {
      conditions.push(eq(manualInvoiceRequests.status, input.status));
    }
    if (input.q?.trim()) {
      const pattern = `%${input.q.trim()}%`;
      const searchCondition = or(
        ilike(manualInvoiceRequests.reference, pattern),
        ilike(manualInvoiceRequests.customerName, pattern),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(manualInvoiceRequests)
      .where(and(...conditions));

    const rows = await this.db.query.manualInvoiceRequests.findMany({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      orderBy: [desc(manualInvoiceRequests.createdAt)],
      where: and(...conditions),
      with: manualInvoiceRequestRelations,
    });

    return {
      items: rows.map(mapManualInvoiceRequestRecord),
      total: countRow?.count ?? 0,
    };
  }

  async findByReference(
    reference: string,
  ): Promise<ManualInvoiceRequestRecord | null> {
    const row = await this.db.query.manualInvoiceRequests.findFirst({
      where: (table, { eq }) => eq(table.reference, reference),
      with: manualInvoiceRequestRelations,
    });

    return row ? mapManualInvoiceRequestRecord(row) : null;
  }

  async approveRequestTransaction(input: {
    approvedBy: string;
    invoice: Parameters<typeof insertIssuedInvoice>[1];
    note: string | null;
    now: Date;
    requestId: string;
  }) {
    const result = await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(manualInvoiceRequests)
        .where(eq(manualInvoiceRequests.id, input.requestId))
        .for("update");

      if (!current) throw manualInvoiceRequestNotFoundError(input.requestId);
      if (current.status !== "pending") {
        throw manualInvoiceRequestStateError();
      }

      const invoice = await insertIssuedInvoice(tx, input.invoice);

      await tx
        .update(manualInvoiceRequests)
        .set({
          approvedAt: input.now,
          approvedBy: input.approvedBy,
          approvedInvoiceId: invoice.id,
          status: "approved",
          updatedAt: input.now,
        })
        .where(eq(manualInvoiceRequests.id, input.requestId));

      await tx.insert(manualInvoiceRequestEvents).values({
        action: "approved",
        actorId: input.approvedBy,
        createdAt: input.now,
        note: input.note,
        requestId: input.requestId,
      });

      return invoice;
    });

    const request = await this.findCreatedRequestById(input.requestId);
    return { invoice: result, request };
  }

  async rejectRequestTransaction(input: {
    actorId: string;
    now: Date;
    reason: string;
    requestId: string;
  }): Promise<ManualInvoiceRequestRecord> {
    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(manualInvoiceRequests)
        .where(eq(manualInvoiceRequests.id, input.requestId))
        .for("update");

      if (!current) throw manualInvoiceRequestNotFoundError(input.requestId);
      if (current.status !== "pending") {
        throw manualInvoiceRequestStateError();
      }

      await tx
        .update(manualInvoiceRequests)
        .set({
          rejectedAt: input.now,
          rejectedBy: input.actorId,
          rejectionReason: input.reason,
          status: "rejected",
          updatedAt: input.now,
        })
        .where(eq(manualInvoiceRequests.id, input.requestId));

      await tx.insert(manualInvoiceRequestEvents).values({
        action: "rejected",
        actorId: input.actorId,
        createdAt: input.now,
        note: input.reason,
        requestId: input.requestId,
      });
    });

    return this.findCreatedRequestById(input.requestId);
  }

  private async findCreatedRequest(
    reference: string,
  ): Promise<ManualInvoiceRequestRecord> {
    const request = await this.findByReference(reference);
    if (!request) throw new Error("Created manual invoice request not found.");
    return request;
  }

  private async findCreatedRequestById(
    id: string,
  ): Promise<ManualInvoiceRequestRecord> {
    const row = await this.db.query.manualInvoiceRequests.findFirst({
      where: (table, { eq }) => eq(table.id, id),
      with: manualInvoiceRequestRelations,
    });
    if (!row) throw manualInvoiceRequestNotFoundError(id);
    return mapManualInvoiceRequestRecord(row);
  }
}
