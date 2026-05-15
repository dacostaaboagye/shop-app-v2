import type {
  StockTakeDetailResponse,
  StockTakeImportDryRunRequest,
} from "@/lib/react-query/stock-takes";

const IN_APP_FILE_SIGNATURE_PREFIX = "in-app:";

/**
 * Build a synthetic dry-run request from the persisted lines of an in-app
 * count entry session. Reuses the existing CSV import path so the in-app
 * panel and the upload panel share one validation surface — there is no
 * separate "in-app dry-run" endpoint.
 *
 * Each line emits one CSV row, even when its counted quantity is still
 * empty. The existing dry-run validator reports missing counts as row-
 * level errors, which is the contract the in-app panel inherits.
 */
export function buildInAppCountsCsvRequest(
  detail: StockTakeDetailResponse,
): StockTakeImportDryRunRequest {
  const header = "lineNumber,sku,countedQuantity,notes";
  const rows = detail.lines.map((line) => {
    const lineNumber = line.lineNumber;
    const sku = escapeCsv(line.sku ?? "");
    const counted =
      line.countedQuantity === null || line.countedQuantity === undefined
        ? ""
        : String(line.countedQuantity);
    const notes = escapeCsv(line.note ?? "");
    return `${lineNumber},${sku},${counted},${notes}`;
  });

  return {
    contentType: "text/csv",
    csv: [header, ...rows, ""].join("\n"),
    fileName: getInAppCountsFileName(detail.stockTakeReference),
  };
}

export function getInAppCountsFileSignature(
  stockTakeReference: string,
): string {
  return `${IN_APP_FILE_SIGNATURE_PREFIX}${stockTakeReference}`;
}

export function getInAppCountsFileName(stockTakeReference: string): string {
  return `${stockTakeReference}-in-app-counts.csv`;
}

function escapeCsv(value: string): string {
  if (value === "") return "";
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
