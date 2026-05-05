import type {
  StockTakeImportContentType,
  StockTakeImportDryRunError,
  StockTakeImportDryRunRequest,
  StockTakeImportDryRunResponse,
  StockTakeImportDryRunRow,
  StockTakeImportDryRunSummary,
  StockTakeStatus,
} from "@/lib/react-query/stock-takes";

export const STOCK_TAKE_IMPORT_CONTENT_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.ms-excel",
] as const satisfies readonly StockTakeImportContentType[];

export function resolveImportContentType(
  file: File,
): StockTakeImportContentType {
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  if (isStockTakeImportContentType(file.type)) {
    return file.type;
  }

  return "text/csv";
}

export function getImportFileSignature(file: File) {
  return [
    file.name,
    file.size,
    file.lastModified,
    resolveImportContentType(file),
  ].join(":");
}

export async function buildStockTakeImportRequest(
  file: File,
): Promise<StockTakeImportDryRunRequest> {
  const contentType = resolveImportContentType(file);
  if (
    contentType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return {
      contentType,
      fileName: file.name,
      workbookBase64: await fileToBase64(file),
    };
  }

  return {
    contentType,
    csv: await file.text(),
    fileName: file.name,
  };
}

export function getDryRunReadinessMessage(
  dryRun: StockTakeImportDryRunResponse,
) {
  if (dryRun.canApply) {
    return "The file passed validation. Review the variances before applying in the final workflow.";
  }

  return "Resolve the reported rows before this import can be applied.";
}

export function getApplyDisabledReason(input: {
  currentFileSignature: string | null;
  dryRun: StockTakeImportDryRunResponse | null;
  isPending: boolean;
  sessionStatus: StockTakeStatus;
  validatedFileSignature: string | null;
}) {
  if (input.isPending) {
    return "Apply is already in progress.";
  }

  if (input.sessionStatus === "applied") {
    return "This stock-take has already been applied.";
  }

  if (input.sessionStatus === "cancelled") {
    return "This stock-take was cancelled and cannot be applied.";
  }

  if (!input.dryRun) {
    return "Run a successful dry-run before applying.";
  }

  if (!input.dryRun.canApply) {
    return "Resolve the dry-run errors before applying.";
  }

  if (
    !input.currentFileSignature ||
    input.currentFileSignature !== input.validatedFileSignature
  ) {
    return "The selected file changed. Run the dry-run again before applying.";
  }

  return null;
}

export function getRowDisplayName(row: StockTakeImportDryRunRow) {
  const parts = [row.productName, row.variantName].filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : "Unknown product";
}

export function getRowTone(row: StockTakeImportDryRunRow) {
  if (row.status === "valid" && row.variance !== null && row.variance !== 0) {
    return "secondary";
  }

  if (row.status === "valid") {
    return "default";
  }

  if (row.status === "manual_unsupported") {
    return "secondary";
  }

  return "destructive";
}

export function buildSummaryStats(summary: StockTakeImportDryRunSummary) {
  return [
    { label: "Total rows", value: summary.totalRows },
    { label: "Valid rows", value: summary.validRows },
    { label: "Invalid rows", value: summary.invalidRows },
    { label: "Duplicate rows", value: summary.duplicateRows },
    { label: "Unknown SKU rows", value: summary.unknownRows },
    { label: "Variance rows", value: summary.varianceRows },
  ];
}

export function buildVarianceStats(summary: StockTakeImportDryRunSummary) {
  return [
    { label: "Positive variance", value: summary.totalPositiveVariance },
    { label: "Negative variance", value: summary.totalNegativeVariance },
  ];
}

export function getErrorAnchor(error: StockTakeImportDryRunError) {
  const row = `Row ${error.rowNumber}`;
  return error.lineNumber ? `${row}, line ${error.lineNumber}` : row;
}

function isStockTakeImportContentType(
  value: string,
): value is StockTakeImportContentType {
  return STOCK_TAKE_IMPORT_CONTENT_TYPES.some((type) => type === value);
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}
