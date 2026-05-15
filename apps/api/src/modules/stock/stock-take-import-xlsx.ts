import type { StockTakeDryRunRowError } from "@shop/contracts";
import ExcelJS from "exceljs";
import {
  parseStockTakeImportCsv,
  type StockTakeImportParseResult,
} from "./stock-take-import-parser.js";

const maxWorkbookBytes = 3_750_000;
const maxWorkbookRows = 20_000;

const headerAliases = new Map([
  ["line", "lineNumber"],
  ["linenumber", "lineNumber"],
  ["line#", "lineNumber"],
  ["sku", "sku"],
  ["counted", "countedQuantity"],
  ["countedquantity", "countedQuantity"],
  ["notes", "notes"],
  ["note", "notes"],
]);

type ImportColumn = "countedQuantity" | "lineNumber" | "notes" | "sku";

export async function parseStockTakeImportXlsx(
  workbookBase64: string,
): Promise<StockTakeImportParseResult> {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(workbookBase64, "base64");

  if (buffer.length > maxWorkbookBytes) {
    return malformedWorkbook("Workbook is too large to import safely.");
  }

  try {
    await workbook.xlsx.load(toLoadableBuffer(buffer));
  } catch {
    return malformedWorkbook(
      "Workbook could not be read. Upload the generated XLSX file.",
    );
  }

  const worksheet = workbook.getWorksheet("Stock Take");
  const header = worksheet ? findHeader(worksheet) : null;
  if (!worksheet || !header) {
    return malformedWorkbook(
      "Workbook header row with Line #, SKU, and Counted quantity is required.",
    );
  }
  if (worksheet.rowCount > maxWorkbookRows) {
    return malformedWorkbook(
      "Workbook has too many rows to import safely. Generate a new stock-take workbook and try again.",
    );
  }

  return parseStockTakeImportCsv(toCsvText(worksheet, header));
}

function findHeader(worksheet: ExcelJS.Worksheet) {
  for (
    let rowNumber = 1;
    rowNumber <= Math.min(30, worksheet.rowCount);
    rowNumber += 1
  ) {
    const columns = new Map<ImportColumn, number>();
    const row = worksheet.getRow(rowNumber);

    row.eachCell((cell, colNumber) => {
      const alias = headerAliases.get(normalizeHeader(cellText(cell)));
      if (alias) columns.set(alias as ImportColumn, colNumber);
    });

    if (
      columns.has("lineNumber") &&
      columns.has("sku") &&
      columns.has("countedQuantity")
    ) {
      return { columns, rowNumber };
    }
  }

  return null;
}

function toCsvText(
  worksheet: ExcelJS.Worksheet,
  header: { columns: Map<ImportColumn, number>; rowNumber: number },
) {
  const lines = Array.from({ length: header.rowNumber - 1 }, () => "");
  lines.push("lineNumber,sku,countedQuantity,notes");

  for (
    let rowNumber = header.rowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber);
    const values = [
      valueAt(row, header.columns, "lineNumber"),
      valueAt(row, header.columns, "sku"),
      valueAt(row, header.columns, "countedQuantity"),
      valueAt(row, header.columns, "notes"),
    ];

    if (values.some((value) => value.trim().length > 0)) {
      lines.push(values.map(csvCell).join(","));
    } else {
      lines.push("");
    }
  }

  return lines.join("\n");
}

function valueAt(
  row: ExcelJS.Row,
  columns: Map<ImportColumn, number>,
  column: ImportColumn,
) {
  const colNumber = columns.get(column);
  return colNumber ? cellText(row.getCell(colNumber)) : "";
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if ("formula" in value) return String(value.formula);
  if ("text" in value) return value.text ?? "";
  if ("richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }

  return String(value);
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "").replaceAll(".", "");
}

function csvCell(value: string) {
  if (!/[",\r\n]/.test(value)) return value;

  return `"${value.replaceAll('"', '""')}"`;
}

function rowError(error: StockTakeDryRunRowError): StockTakeDryRunRowError {
  return error;
}

function malformedWorkbook(message: string): StockTakeImportParseResult {
  return {
    errors: [
      rowError({
        code: "malformed_csv",
        message,
        rowNumber: 1,
      }),
    ],
    rows: [],
    totalRows: 0,
  };
}

function toLoadableBuffer(
  buffer: Buffer,
): Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0] {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
}
