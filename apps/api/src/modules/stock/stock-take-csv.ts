import type {
  StockTakeLine,
  StockTakeMode,
  StockTakeSessionDetail,
} from "@shop/contracts";

const blindHeaders = [
  "lineNumber",
  "productName",
  "variantName",
  "sku",
  "barcode",
  "unitOfMeasure",
  "countedQuantity",
  "notes",
] as const;

const assistedHeaders = [
  ...blindHeaders,
  "systemOnHand",
  "reservedQuantity",
  "availableQuantity",
  "variance",
] as const;

const blankHeaders = [
  "lineNumber",
  "productName",
  "variantName",
  "sku",
  "unitOfMeasure",
  "countedQuantity",
  "notes",
] as const;

export function buildStockTakeCsv(session: StockTakeSessionDetail): string {
  const headers = selectHeaders(session);
  const rows = session.lines.map((line) => rowForLine(line, session.mode));

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n");
}

export function createStockTakeCsvFilename(input: {
  locationSlug: string;
  stockTakeReference: string;
}): string {
  return `${safeFilePart(input.stockTakeReference)}-${safeFilePart(
    input.locationSlug,
  )}-sheet.csv`;
}

function selectHeaders(session: StockTakeSessionDetail) {
  if (session.blankSheet) return blankHeaders;
  if (session.mode === "assisted") return assistedHeaders;
  return blindHeaders;
}

function rowForLine(line: StockTakeLine, mode: StockTakeMode) {
  return {
    availableQuantity: line.availableQuantity?.toString() ?? "",
    barcode: line.barcode ?? "",
    countedQuantity: line.countedQuantity?.toString() ?? "",
    lineNumber: String(line.lineNumber),
    notes: line.note ?? "",
    productName: line.productName,
    reservedQuantity: line.reservedQuantity?.toString() ?? "",
    sku: line.sku,
    systemOnHand: line.systemOnHand?.toString() ?? "",
    unitOfMeasure: line.unitOfMeasure,
    variance: mode === "assisted" ? (line.variance?.toString() ?? "") : "",
    variantName: line.variantName,
  };
}

function csvCell(value: string): string {
  const safeValue = neutralizeSpreadsheetFormula(value);
  if (!/[",\r\n]/.test(safeValue)) return safeValue;

  return `"${safeValue.replaceAll('"', '""')}"`;
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-") || "stock-take";
}

function neutralizeSpreadsheetFormula(value: string): string {
  return /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
}
