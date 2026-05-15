import type { CatalogReferenceImportResponse } from "@shop/contracts";

export function normalizeCsvContentType(
  file: File,
): "text/csv" | "application/vnd.ms-excel" {
  return file.type === "application/vnd.ms-excel"
    ? "application/vnd.ms-excel"
    : "text/csv";
}

export function referenceFailedRowsToCsv(
  result: CatalogReferenceImportResponse,
): string {
  const headers = ["rowNumber", "errors", ...getOriginalRowHeaders(result)];
  const rows = result.failedRows.map((row) => [
    String(row.rowNumber),
    row.errors.map((error) => error.message).join("; "),
    ...headers.slice(2).map((header) => row.originalRow[header] ?? ""),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getReferenceImportResultCopy(
  result: CatalogReferenceImportResponse,
): string {
  if (result.summary.failedRows === 0) {
    return `${result.summary.importedRows} row(s) imported.`;
  }

  return `${result.summary.importedRows} row(s) imported and ${result.summary.failedRows} row(s) need correction.`;
}

function getOriginalRowHeaders(result: CatalogReferenceImportResponse) {
  const headers = new Set<string>();

  for (const row of result.failedRows) {
    for (const key of Object.keys(row.originalRow)) {
      headers.add(key);
    }
  }

  return Array.from(headers);
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

export function getFailedRowSummary(
  row: CatalogReferenceImportResponse["failedRows"][number],
) {
  return row.errors.map((error) => error.message).join("; ");
}
