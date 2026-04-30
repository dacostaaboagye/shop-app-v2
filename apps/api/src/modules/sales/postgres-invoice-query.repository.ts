import { invoices } from "@shop/database";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { mapInvoice, mapLineItem } from "./postgres-invoice.mappers.js";
import type { InvoiceRecord, InvoiceWithLines } from "./sales.contracts.js";

export class PostgresInvoiceQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async findByReference(reference: string): Promise<InvoiceWithLines | null> {
    const invoice = await this.db.query.invoices.findFirst({
      where: (t, { eq }) => eq(t.reference, reference),
      with: {
        attributedWorker: {
          columns: { firstName: true, lastName: true, email: true },
        },
        lines: true,
        parentInvoice: {
          columns: { reference: true },
        },
        replacementInvoice: {
          columns: { reference: true },
        },
        revisionCreditNote: {
          columns: { reference: true },
        },
        revisionRootInvoice: {
          columns: { reference: true },
        },
      },
    });

    if (!invoice) return null;

    const workerName = invoice.attributedWorker
      ? `${invoice.attributedWorker.firstName} ${invoice.attributedWorker.lastName}`.trim()
      : null;
    const currentPayableReference =
      await this.resolveCurrentPayableReferenceForRow(invoice);

    return {
      ...mapInvoiceWithRelations(invoice),
      attributedWorkerName: workerName,
      attributedWorkerEmail: invoice.attributedWorker?.email ?? null,
      currentPayableReference,
      lines: invoice.lines.map(mapLineItem),
    };
  }

  async listByLocation(input: {
    classification?: "internal" | "outgoing";
    dateFrom?: Date;
    dateTo?: Date;
    documentType?: "adjusted" | "credit_note" | "invoice";
    locationId: string;
    page: number;
    pageSize: number;
    q?: string;
    workerId?: string;
  }): Promise<{ items: InvoiceRecord[]; total: number }> {
    const conditions = [eq(invoices.locationId, input.locationId)];
    if (input.workerId) {
      conditions.push(eq(invoices.attributedWorkerId, input.workerId));
    }
    if (input.classification) {
      conditions.push(eq(invoices.classification, input.classification));
    }
    if (input.documentType) {
      conditions.push(eq(invoices.type, mapDocumentType(input.documentType)));
    }
    if (input.dateFrom) {
      conditions.push(gte(invoices.createdAt, input.dateFrom));
    }
    if (input.dateTo) {
      conditions.push(lte(invoices.createdAt, input.dateTo));
    }
    if (input.q?.trim()) {
      const pattern = `%${input.q.trim()}%`;
      conditions.push(
        sql`(${invoices.reference} ilike ${pattern} or coalesce(${invoices.customerName}, '') ilike ${pattern})`,
      );
    }

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(...conditions));
    const count = countResult[0]?.count ?? 0;

    const rows = await this.db.query.invoices.findMany({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      where: and(...conditions),
      with: {
        parentInvoice: {
          columns: { reference: true },
        },
        replacementInvoice: {
          columns: { reference: true },
        },
        revisionCreditNote: {
          columns: { reference: true },
        },
        revisionRootInvoice: {
          columns: { reference: true },
        },
      },
    });

    const items = await Promise.all(
      rows.map(async (row) => ({
        ...mapInvoiceWithRelations(row),
        currentPayableReference:
          await this.resolveCurrentPayableReferenceForRow(row),
      })),
    );

    return { items, total: count };
  }

  async listByWorker(input: {
    classification?: "internal" | "outgoing";
    dateFrom?: Date;
    dateTo?: Date;
    documentType?: "adjusted" | "credit_note" | "invoice";
    locationId: string;
    page: number;
    pageSize: number;
    q?: string;
    workerId: string;
  }): Promise<{ items: InvoiceRecord[]; total: number }> {
    const conditions = [
      eq(invoices.locationId, input.locationId),
      or(
        eq(invoices.attributedWorkerId, input.workerId),
        eq(invoices.createdBy, input.workerId),
      ),
    ];
    if (input.classification) {
      conditions.push(eq(invoices.classification, input.classification));
    }
    if (input.dateFrom) {
      conditions.push(gte(invoices.createdAt, input.dateFrom));
    }
    if (input.documentType) {
      conditions.push(eq(invoices.type, mapDocumentType(input.documentType)));
    }
    if (input.dateTo) {
      conditions.push(lte(invoices.createdAt, input.dateTo));
    }
    if (input.q?.trim()) {
      const pattern = `%${input.q.trim()}%`;
      conditions.push(
        sql`(${invoices.reference} ilike ${pattern} or coalesce(${invoices.customerName}, '') ilike ${pattern})`,
      );
    }

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(...conditions));
    const count = countResult[0]?.count ?? 0;

    const rows = await this.db.query.invoices.findMany({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      where: and(...conditions),
      with: {
        parentInvoice: {
          columns: { reference: true },
        },
        replacementInvoice: {
          columns: { reference: true },
        },
        revisionCreditNote: {
          columns: { reference: true },
        },
        revisionRootInvoice: {
          columns: { reference: true },
        },
      },
    });

    const items = await Promise.all(
      rows.map(async (row) => ({
        ...mapInvoiceWithRelations(row),
        currentPayableReference:
          await this.resolveCurrentPayableReferenceForRow(row),
      })),
    );

    return { items, total: count };
  }

  private async resolveCurrentPayableReferenceForRow(row: {
    parentInvoice?: { reference: string } | null;
    reference: string;
    replacementInvoice?: { reference: string } | null;
    revisionRootInvoice?: { reference: string } | null;
    status: "confirmed" | "superseded" | "voided";
    type:
      | "adjusted"
      | "credit_note"
      | "ecommerce"
      | "manual"
      | "portal"
      | "pos";
  }) {
    if (row.type === "credit_note") {
      const startReference =
        row.replacementInvoice?.reference ??
        row.revisionRootInvoice?.reference ??
        row.parentInvoice?.reference ??
        null;

      if (!startReference) {
        return null;
      }

      return this.resolveLatestPayableReference(startReference);
    }

    return this.resolveLatestPayableReference(row.reference);
  }

  private async resolveLatestPayableReference(reference: string) {
    let currentReference: string | null = reference;
    const seenReferences = new Set<string>();

    while (currentReference) {
      if (seenReferences.has(currentReference)) {
        return null;
      }

      const activeReference: string = currentReference;
      seenReferences.add(activeReference);
      const invoice:
        | {
            reference: string;
            replacementInvoice: { reference: string } | null;
            status: string;
            type: string;
          }
        | null
        | undefined = await this.db.query.invoices.findFirst({
        columns: {
          reference: true,
          status: true,
          type: true,
        },
        where: (t, { eq }) => eq(t.reference, activeReference),
        with: {
          replacementInvoice: {
            columns: { reference: true },
          },
        },
      });

      if (!invoice) {
        return null;
      }

      if (!invoice.replacementInvoice?.reference) {
        return invoice.type !== "credit_note" && invoice.status === "confirmed"
          ? invoice.reference
          : null;
      }

      currentReference = invoice.replacementInvoice.reference;
    }

    return null;
  }
}

function mapInvoiceWithRelations(
  row: Parameters<typeof mapInvoice>[0] & {
    parentInvoice?: { reference: string } | null;
    replacementInvoice?: { reference: string } | null;
    revisionCreditNote?: { reference: string } | null;
    revisionRootInvoice?: { reference: string } | null;
  },
): InvoiceRecord {
  return {
    ...mapInvoice(row),
    parentInvoiceReference: row.parentInvoice?.reference ?? null,
    replacementInvoiceReference: row.replacementInvoice?.reference ?? null,
    revisionCreditNoteReference: row.revisionCreditNote?.reference ?? null,
    revisionRootReference: row.revisionRootInvoice?.reference ?? null,
  };
}

function mapDocumentType(documentType: "adjusted" | "credit_note" | "invoice") {
  if (documentType === "credit_note") return "credit_note";
  if (documentType === "adjusted") return "adjusted";
  return "pos";
}
