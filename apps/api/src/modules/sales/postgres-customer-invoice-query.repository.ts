import { customerContacts, invoices } from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { buildCustomerInvoiceConditions } from "./customer-invoice-query.conditions.js";
import { resolveCurrentPayableReference } from "./invoice-lifecycle.js";
import { mapLineItem } from "./postgres-invoice.mappers.js";
import { mapInvoiceWithRelations } from "./postgres-invoice-query.repository.js";
import type { InvoiceRecord, InvoiceWithLines } from "./sales.contracts.js";

export type CustomerInvoiceListInput = {
  currentPayableOnly?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  documentType?: "adjusted" | "credit_note" | "invoice";
  page: number;
  pageSize: number;
  q?: string;
  status?: "confirmed" | "superseded" | "voided";
  userId: string;
};

export class PostgresCustomerInvoiceQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async listForCustomer(input: CustomerInvoiceListInput): Promise<{
    items: InvoiceRecord[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const customerIds = await this.resolveCustomerIds(input.userId);
    if (customerIds.length === 0) return emptyCustomerInvoiceList(input);

    const conditions = buildCustomerInvoiceConditions(input, customerIds);
    const where = and(...conditions);
    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(where),
      this.db.query.invoices.findMany({
        limit: input.pageSize,
        offset: (input.page - 1) * input.pageSize,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        where,
        with: invoiceRelations,
      }),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => this.mapInvoiceRow(row, customerIds)),
    );

    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      total: countResult[0]?.count ?? 0,
    };
  }

  async findForCustomerByReference(input: {
    reference: string;
    userId: string;
  }): Promise<InvoiceWithLines | null> {
    const customerIds = await this.resolveCustomerIds(input.userId);
    if (customerIds.length === 0) return null;

    const invoice = await this.db.query.invoices.findFirst({
      where: (t, { and, eq, inArray }) =>
        and(
          eq(t.reference, input.reference),
          inArray(t.customerId, customerIds),
          eq(t.classification, "outgoing"),
        ),
      with: {
        ...invoiceRelations,
        lines: true,
      },
    });
    if (!invoice) return null;

    return {
      ...(await this.mapInvoiceRow(invoice, customerIds)),
      lines: invoice.lines.map(mapLineItem),
    };
  }

  private async resolveCustomerIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ customerId: customerContacts.customerId })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.userId, userId),
          eq(customerContacts.status, "active"),
        ),
      );

    return [...new Set(rows.map((row) => row.customerId))];
  }

  private async mapInvoiceRow(
    row: CustomerInvoiceRow,
    customerIds: readonly string[],
  ): Promise<InvoiceRecord> {
    return {
      ...mapInvoiceWithRelations(row),
      currentPayableReference: await this.resolveCurrentPayableReferenceForRow(
        row,
        customerIds,
      ),
    };
  }

  private async resolveCurrentPayableReferenceForRow(
    row: {
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
    },
    customerIds: readonly string[],
  ) {
    return resolveCurrentPayableReference({
      findByReference: (reference) =>
        this.findLifecycleReferenceByReference(reference, customerIds),
      invoice: {
        parentInvoiceReference: row.parentInvoice?.reference ?? null,
        reference: row.reference,
        replacementInvoiceReference: row.replacementInvoice?.reference ?? null,
        revisionRootReference: row.revisionRootInvoice?.reference ?? null,
        status: row.status,
        type: row.type,
      },
    });
  }

  private async findLifecycleReferenceByReference(
    reference: string,
    customerIds: readonly string[],
  ) {
    const invoice = await this.db.query.invoices.findFirst({
      columns: {
        reference: true,
        status: true,
        type: true,
      },
      where: (t, { and, eq, inArray }) =>
        and(
          eq(t.reference, reference),
          inArray(t.customerId, [...customerIds]),
          eq(t.classification, "outgoing"),
        ),
      with: {
        replacementInvoice: {
          columns: { reference: true },
        },
      },
    });

    if (!invoice) return null;

    return {
      reference: invoice.reference,
      replacementInvoiceReference:
        invoice.replacementInvoice?.reference ?? null,
      status: invoice.status,
      type: invoice.type,
    };
  }
}

const invoiceRelations = {
  customer: {
    columns: { reference: true, slug: true },
  },
  customerContact: {
    columns: { reference: true },
  },
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
} as const;

type CustomerInvoiceRow = Parameters<typeof mapInvoiceWithRelations>[0] & {
  parentInvoice?: { reference: string } | null;
  replacementInvoice?: { reference: string } | null;
  revisionRootInvoice?: { reference: string } | null;
};

function emptyCustomerInvoiceList(
  input: Pick<CustomerInvoiceListInput, "page" | "pageSize">,
) {
  return {
    items: [],
    page: input.page,
    pageSize: input.pageSize,
    total: 0,
  };
}
