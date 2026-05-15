export type StockTakeCsvRecord = { rowNumber: number; values: string[] };

export type StockTakeCsvParseResult = {
  error?: { message: string; rowNumber: number };
  records: StockTakeCsvRecord[];
};

export function parseStockTakeCsvRecords(
  csvText: string,
): StockTakeCsvParseResult {
  const text = csvText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const records: StockTakeCsvRecord[] = [];
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
      if (cell.length > 0) return csvError(lineNumber);
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

  if (inQuotes) return csvError(lineNumber);
  if (cell.length > 0 || row.length > 0 || text.length > 0) {
    records.push({ rowNumber, values: [...row, cell] });
  }

  return { records };
}

function csvError(rowNumber: number): StockTakeCsvParseResult {
  return {
    error: { message: "CSV content is malformed.", rowNumber },
    records: [],
  };
}
