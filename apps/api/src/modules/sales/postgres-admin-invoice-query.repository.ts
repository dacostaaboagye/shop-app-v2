import { invoices } from "@shop/database";
import { and, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { buildAdminInvoiceConditions } from "./admin-invoice-query.conditions.js";
import { resolveCurrentPayableReference } from "./invoice-lifecycle.js";
import { mapInvoiceWithRelations } from "./postgres-invoice-query.repository.js";
import type {
  AdminInvoiceListResult,
  AdminInvoiceRecord,
  AdminInvoiceReportingTotals,
} from "./sales.contracts.js";

export type AdminInvoiceListInput = {
  channel?: "ecommerce" | "manual" | "portal" | "pos";
  classification?: "internal" | "outgoing";
  currentPayableOnly?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  documentType?: "adjusted" | "credit_note" | "invoice";
  locationIds: readonly string[];
  page: number;
  pageSize: number;
  q?: string;
  status?: "confirmed" | "superseded" | "voided";
  workerId?: string;
};

export class PostgresAdminInvoiceQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async listForAdmin(
    input: AdminInvoiceListInput,
  ): Promise<AdminInvoiceListResult> {
    if (input.locationIds.length === 0) {
      return emptyAdminInvoiceList(input);
    }

    const conditions = buildAdminInvoiceConditions(input);
    const [countResult, totalsResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(and(...conditions)),
      this.db
        .select({
          adjustedInvoiceCount: sql<number>`count(*) filter (where ${invoices.type} = 'adjusted')::int`,
          creditedAmount: sql<string>`coalesce(sum(case when ${invoices.type} = 'credit_note' and ${invoices.status} = 'confirmed' then ${invoices.totalAmount} else 0 end), 0)::text`,
          creditNoteCount: sql<number>`count(*) filter (where ${invoices.type} = 'credit_note')::int`,
          currentPayableAmount: sql<string>`coalesce(sum(case when ${invoices.type} <> 'credit_note' and ${invoices.status} = 'confirmed' and ${invoices.replacementInvoiceId} is null then ${invoices.totalAmount} else 0 end), 0)::text`,
          grossOriginalSalesAmount: sql<string>`coalesce(sum(case when ${invoices.type} in ('pos', 'portal', 'ecommerce', 'manual') and ${invoices.status} <> 'voided' then ${invoices.totalAmount} else 0 end), 0)::text`,
          supersededAmount: sql<string>`coalesce(sum(case when ${invoices.status} = 'superseded' then ${invoices.totalAmount} else 0 end), 0)::text`,
          voidedAmount: sql<string>`coalesce(sum(case when ${invoices.status} = 'voided' then ${invoices.totalAmount} else 0 end), 0)::text`,
        })
        .from(invoices)
        .where(and(...conditions)),
      this.db.query.invoices.findMany({
        limit: input.pageSize,
        offset: (input.page - 1) * input.pageSize,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        where: and(...conditions),
        with: {
          attributedWorker: {
            columns: { email: true, firstName: true, lastName: true },
          },
          location: {
            columns: { name: true, slug: true },
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
        },
      }),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => this.mapAdminInvoiceRow(row)),
    );

    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      total: countResult[0]?.count ?? 0,
      totals: normalizeTotals(totalsResult[0]),
    };
  }

  private async mapAdminInvoiceRow(
    row: Parameters<typeof mapInvoiceWithRelations>[0] & {
      attributedWorker?: {
        email: string;
        firstName: string;
        lastName: string;
      } | null;
      location: { name: string; slug: string };
    },
  ): Promise<AdminInvoiceRecord> {
    const workerName = row.attributedWorker
      ? `${row.attributedWorker.firstName} ${row.attributedWorker.lastName}`.trim()
      : null;

    return {
      ...mapInvoiceWithRelations(row),
      attributedWorkerEmail: row.attributedWorker?.email ?? null,
      attributedWorkerName: workerName,
      currentPayableReference:
        await this.resolveCurrentPayableReferenceForRow(row),
      locationName: row.location.name,
      locationSlug: row.location.slug,
    };
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
    return resolveCurrentPayableReference({
      findByReference: (reference) =>
        this.findLifecycleReferenceByReference(reference),
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

  private async findLifecycleReferenceByReference(reference: string) {
    const invoice = await this.db.query.invoices.findFirst({
      columns: {
        reference: true,
        status: true,
        type: true,
      },
      where: (t, { eq }) => eq(t.reference, reference),
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

function normalizeTotals(
  totals: AdminInvoiceReportingTotals | undefined,
): AdminInvoiceReportingTotals {
  return (
    totals ?? {
      adjustedInvoiceCount: 0,
      creditedAmount: "0",
      creditNoteCount: 0,
      currentPayableAmount: "0",
      grossOriginalSalesAmount: "0",
      supersededAmount: "0",
      voidedAmount: "0",
    }
  );
}

function emptyAdminInvoiceList(
  input: Pick<AdminInvoiceListInput, "page" | "pageSize">,
): AdminInvoiceListResult {
  return {
    items: [],
    page: input.page,
    pageSize: input.pageSize,
    total: 0,
    totals: normalizeTotals(undefined),
  };
}
