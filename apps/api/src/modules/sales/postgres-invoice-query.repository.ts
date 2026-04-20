import { invoices } from "@shop/database";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
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
      },
    });

    if (!invoice) return null;

    const workerName = invoice.attributedWorker
      ? `${invoice.attributedWorker.firstName} ${invoice.attributedWorker.lastName}`.trim()
      : null;

    return {
      ...mapInvoice(invoice),
      attributedWorkerName: workerName,
      attributedWorkerEmail: invoice.attributedWorker?.email ?? null,
      lines: invoice.lines.map(mapLineItem),
    };
  }

  async listByLocation(input: {
    dateFrom?: Date;
    dateTo?: Date;
    locationId: string;
    page: number;
    pageSize: number;
    workerId?: string;
  }): Promise<{ items: InvoiceRecord[]; total: number }> {
    const conditions = [eq(invoices.locationId, input.locationId)];
    if (input.workerId) {
      conditions.push(eq(invoices.attributedWorkerId, input.workerId));
    }
    if (input.dateFrom) {
      conditions.push(gte(invoices.createdAt, input.dateFrom));
    }
    if (input.dateTo) {
      conditions.push(lte(invoices.createdAt, input.dateTo));
    }

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(...conditions));
    const count = countResult[0]?.count ?? 0;

    const rows = await this.db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    return { items: rows.map(mapInvoice), total: count };
  }

  async listByWorker(input: {
    dateFrom?: Date;
    dateTo?: Date;
    locationId: string;
    page: number;
    pageSize: number;
    workerId: string;
  }): Promise<{ items: InvoiceRecord[]; total: number }> {
    const conditions = [
      eq(invoices.locationId, input.locationId),
      or(
        eq(invoices.attributedWorkerId, input.workerId),
        eq(invoices.createdBy, input.workerId),
      ),
    ];
    if (input.dateFrom) {
      conditions.push(gte(invoices.createdAt, input.dateFrom));
    }
    if (input.dateTo) {
      conditions.push(lte(invoices.createdAt, input.dateTo));
    }

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(...conditions));
    const count = countResult[0]?.count ?? 0;

    const rows = await this.db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    return { items: rows.map(mapInvoice), total: count };
  }
}
