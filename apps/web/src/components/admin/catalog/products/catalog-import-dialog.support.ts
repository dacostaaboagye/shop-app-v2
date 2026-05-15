import type {
  CatalogImportJobResponse,
  CatalogImportReportResponse,
  CatalogImportUploadResponse,
} from "@shop/contracts";

export type CatalogImportJobStatus = CatalogImportJobResponse["status"];

export function isTerminalImportStatus(
  status: CatalogImportJobStatus,
): boolean {
  return (
    status === "completed" ||
    status === "completed_with_errors" ||
    status === "failed"
  );
}

export function shouldRefreshProductList(
  status: CatalogImportJobStatus,
): boolean {
  return status === "completed" || status === "completed_with_errors";
}

export function canStartCatalogImport(input: {
  hasAcceptedJob: boolean;
  hasSelectedFile: boolean;
  importPending: boolean;
}): boolean {
  return input.hasSelectedFile && !input.importPending && !input.hasAcceptedJob;
}

export function formatImportStatus(status: CatalogImportJobStatus): string {
  return status.replaceAll("_", " ");
}

export function getImportStatusCopy(
  status: CatalogImportJobStatus,
  result: CatalogImportUploadResponse,
): string {
  switch (status) {
    case "queued":
      return `Job ${result.jobReference} for ${result.fileName} is queued and will start shortly.`;
    case "processing":
      return `Job ${result.jobReference} is processing. Counts will update as rows are checked.`;
    case "completed":
      return `Job ${result.jobReference} completed. The product list is being refreshed.`;
    case "completed_with_errors":
      return `Job ${result.jobReference} completed with failed rows. The product list is being refreshed.`;
    case "failed":
      return `Job ${result.jobReference} failed before it could complete. Review the CSV and try the upload again.`;
  }
}

export function failedRowsToCsv(report: CatalogImportReportResponse): string {
  const header = ["rowNumber", "errors", "values"];
  const rows = report.failedRows.map((row) =>
    [
      String(row.rowNumber),
      row.errors.map((error) => error.message).join("; "),
      JSON.stringify(row.originalRow),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
