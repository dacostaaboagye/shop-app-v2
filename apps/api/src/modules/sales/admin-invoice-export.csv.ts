import type { AdminInvoiceRecord } from "./sales.contracts.js";

type CsvMeasureColumns = {
  creditedAmount: string;
  currentPayableAmount: string;
  grossOriginalSalesAmount: string;
  supersededAmount: string;
  voidedAmount: string;
};

const CSV_HEADERS = [
  "Reference",
  "Type",
  "Status",
  "Classification",
  "Location",
  "Location Slug",
  "Customer Name",
  "Customer Email",
  "Worker",
  "Payment Method",
  "Created At",
  "Confirmed At",
  "Gross Original Amount",
  "Credited Amount",
  "Current Payable Amount",
  "Superseded Amount",
  "Voided Amount",
  "Total Amount",
  "Current Payable Reference",
  "Parent Invoice Reference",
  "Replacement Invoice Reference",
] as const;

export function buildAdminInvoiceCsv(records: readonly AdminInvoiceRecord[]) {
  const rows = records.map((record) => {
    const measures = getCsvMeasureColumns(record);

    return [
      record.reference,
      record.type,
      record.status,
      record.classification,
      record.locationName,
      record.locationSlug,
      record.customerName ?? "",
      record.customerEmail ?? "",
      record.attributedWorkerName ?? "",
      record.paymentMethod ?? "",
      record.createdAt.toISOString(),
      record.confirmedAt?.toISOString() ?? "",
      measures.grossOriginalSalesAmount,
      measures.creditedAmount,
      measures.currentPayableAmount,
      measures.supersededAmount,
      measures.voidedAmount,
      record.totalAmount,
      record.currentPayableReference ?? "",
      record.parentInvoiceReference ?? "",
      record.replacementInvoiceReference ?? "",
    ];
  });

  return [CSV_HEADERS, ...rows].map(formatCsvRow).join("\n");
}

export function adminInvoiceExportFilename(now = new Date()): string {
  return `admin-invoices-${now.toISOString().slice(0, 10)}.csv`;
}

function getCsvMeasureColumns(record: AdminInvoiceRecord): CsvMeasureColumns {
  const isOriginal =
    record.type === "pos" ||
    record.type === "portal" ||
    record.type === "ecommerce" ||
    record.type === "manual";
  const isCurrentPayable =
    record.type !== "credit_note" &&
    record.status === "confirmed" &&
    record.replacementInvoiceReference === null;

  return {
    creditedAmount:
      record.type === "credit_note" && record.status === "confirmed"
        ? record.totalAmount
        : "0",
    currentPayableAmount: isCurrentPayable ? record.totalAmount : "0",
    grossOriginalSalesAmount:
      isOriginal && record.status !== "voided" ? record.totalAmount : "0",
    supersededAmount: record.status === "superseded" ? record.totalAmount : "0",
    voidedAmount: record.status === "voided" ? record.totalAmount : "0",
  };
}

function formatCsvRow(values: readonly string[]) {
  return values.map(formatCsvCell).join(",");
}

function formatCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) return value;

  return `"${value.replace(/"/g, '""')}"`;
}
