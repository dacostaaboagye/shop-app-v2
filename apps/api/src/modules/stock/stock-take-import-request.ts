import type { StockTakeImportDryRunRequest } from "@shop/contracts";
import {
  parseStockTakeImportCsv,
  type StockTakeImportParseResult,
} from "./stock-take-import-parser.js";
import { parseStockTakeImportXlsx } from "./stock-take-import-xlsx.js";

export async function parseStockTakeImportRequest(
  request: StockTakeImportDryRunRequest,
): Promise<StockTakeImportParseResult> {
  if ("workbookBase64" in request) {
    return parseStockTakeImportXlsx(request.workbookBase64);
  }

  return parseStockTakeImportCsv(request.csv);
}
