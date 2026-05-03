import type { CatalogImportRowError } from "@shop/contracts";

export type CatalogImportCsvRecord = { rowNumber: number; values: string[] };

export type CatalogImportCsvParseResult = {
  error?: CatalogImportRowError;
  records: CatalogImportCsvRecord[];
};

export function parseCatalogImportCsvRecords(
  csvText: string,
): CatalogImportCsvParseResult {
  const text = csvText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const records: CatalogImportCsvRecord[] = [];
  let cell = "";
  let row: string[] = [];
  let rowNumber = 1;
  let lineNumber = 1;
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    const next = text[index + 1];
    if (inQuotes && char === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (inQuotes && char === '"') {
      inQuotes = false;
    } else if (inQuotes) {
      cell += char;
      if (char === "\n") lineNumber += 1;
    } else if (char === '"') {
      if (cell.length > 0) return { error: csvError(lineNumber), records: [] };
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      records.push({ rowNumber, values: [...row, cell] });
      row = [];
      cell = "";
      lineNumber += 1;
      rowNumber = lineNumber;
    } else {
      cell += char;
    }
  }

  if (inQuotes) return { error: csvError(lineNumber), records: [] };
  if (cell.length > 0 || row.length > 0 || text.length > 0) {
    records.push({ rowNumber, values: [...row, cell] });
  }
  return { records };
}

export function catalogImportOriginalRows(
  csvText: string,
): Map<number, Record<string, string>> {
  const parsed = parseCatalogImportCsvRecords(csvText);
  const header = parsed.records[0]?.values.map((value) => value.trim()) ?? [];
  const rows = new Map<number, Record<string, string>>();
  for (const record of parsed.records.slice(1)) {
    rows.set(
      record.rowNumber,
      toCatalogImportOriginalRowMap(header, record.values),
    );
  }
  return rows;
}

export function toCatalogImportRowMap(
  header: string[],
  values: string[],
): Record<string, string> {
  return Object.fromEntries(
    header.map((column, index) => [column, values[index]?.trim() ?? ""]),
  );
}

function toCatalogImportOriginalRowMap(
  header: string[],
  values: string[],
): Record<string, string> {
  return Object.fromEntries(
    header.map((column, index) => [column, values[index] ?? ""]),
  );
}

function csvError(rowNumber: number): CatalogImportRowError {
  return {
    code: "malformed_csv",
    message: "CSV content is malformed.",
    rowNumber,
  };
}
