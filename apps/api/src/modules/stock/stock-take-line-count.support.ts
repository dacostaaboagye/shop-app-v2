import type {
  StockTakeDryRunRowError,
  StockTakeLineCountEntry,
} from "@shop/contracts";

export type LineCountValidationOutcome =
  | { kind: "ok" }
  | { kind: "errors"; errors: StockTakeDryRunRowError[] };

export function validateLineCountEntries(input: {
  entries: StockTakeLineCountEntry[];
  knownLineNumbers: Set<number>;
}): LineCountValidationOutcome {
  const errors: StockTakeDryRunRowError[] = [];
  const seenLines = new Map<number, number>();

  for (let index = 0; index < input.entries.length; index += 1) {
    const entry = input.entries[index];
    if (!entry) continue;
    const rowNumber = index + 1;

    const firstSeen = seenLines.get(entry.lineNumber);
    if (firstSeen) {
      errors.push({
        code: "duplicate_line",
        field: "lineNumber",
        lineNumber: entry.lineNumber,
        message: `Line number duplicates entry ${firstSeen}.`,
        rowNumber,
      });
      continue;
    }
    seenLines.set(entry.lineNumber, rowNumber);

    if (!input.knownLineNumbers.has(entry.lineNumber)) {
      errors.push({
        code: "missing_line",
        field: "lineNumber",
        lineNumber: entry.lineNumber,
        message: "Line number is not part of this stock-take session.",
        rowNumber,
      });
    }
  }

  if (errors.length > 0) return { kind: "errors", errors };
  return { kind: "ok" };
}
