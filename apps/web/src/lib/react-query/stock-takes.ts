import type {
  StockTakeApplyRequest,
  StockTakeApplyResponse,
  StockTakeSessionDetail as StockTakeDetailResponse,
  StockTakeImportDryRunRequest,
  StockTakeImportDryRunResponse,
  StockTakeMode,
  StockTakeSessionSummary as StockTakeSheetResponse,
} from "@shop/contracts";
import { fetchFile } from "@/lib/react-query/fetch-file";
import { fetchJson } from "@/lib/react-query/fetch-json";

export type {
  StockTakeApplyRequest,
  StockTakeApplyResponse,
  StockTakeDryRunPreviewRow as StockTakeImportDryRunRow,
  StockTakeDryRunRowError as StockTakeImportDryRunError,
  StockTakeDryRunSummary as StockTakeImportDryRunSummary,
  StockTakeImportDryRunRequest,
  StockTakeImportDryRunResponse,
  StockTakeLine,
  StockTakeMode,
  StockTakeSessionDetail as StockTakeDetailResponse,
  StockTakeSessionSummary as StockTakeSheetResponse,
  StockTakeStatus,
} from "@shop/contracts";

export type StockTakePortal = "admin" | "manager";

export type CreateStockTakeRequest = {
  locationSlug: string;
  mode: StockTakeMode;
};

export type StockTakeImportContentType =
  | "text/csv"
  | "application/vnd.ms-excel";

export const stockTakeQueryKey = (portal: StockTakePortal, reference: string) =>
  ["stock-takes", portal, reference] as const;

export const stockTakeImportDryRunQueryKey = (
  portal: StockTakePortal,
  reference: string,
) => ["stock-takes", portal, reference, "imports", "dry-run"] as const;

export async function createStockTakeSheet(
  portal: StockTakePortal,
  body: CreateStockTakeRequest,
): Promise<StockTakeSheetResponse> {
  return fetchJson<StockTakeSheetResponse>(
    `/api/${portal}/stock-takes`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function fetchStockTakeDetail(
  portal: StockTakePortal,
  reference: string,
): Promise<StockTakeDetailResponse> {
  return fetchJson<StockTakeDetailResponse>(
    `/api/${portal}/stock-takes/${encodeURIComponent(reference)}`,
    undefined,
    { auth: "required" },
  );
}

export async function downloadStockTakeSheetCsv(
  portal: StockTakePortal,
  reference: string,
): Promise<File> {
  return fetchFile(
    `/api/${portal}/stock-takes/${encodeURIComponent(reference)}/sheet.csv`,
    undefined,
    {
      auth: "required",
      fallbackFilename: `${reference}-stock-take-sheet.csv`,
    },
  );
}

export async function downloadStockTakeBookletPdf(
  portal: StockTakePortal,
  reference: string,
): Promise<File> {
  return fetchFile(
    `/api/${portal}/stock-takes/${encodeURIComponent(reference)}/booklet.pdf`,
    undefined,
    {
      auth: "required",
      fallbackFilename: `${reference}-stock-take-booklet.pdf`,
    },
  );
}

export async function downloadStockTakeVarianceReportPdf(
  portal: StockTakePortal,
  reference: string,
): Promise<File> {
  return fetchFile(
    `/api/${portal}/stock-takes/${encodeURIComponent(
      reference,
    )}/variance-report.pdf`,
    undefined,
    {
      auth: "required",
      fallbackFilename: `${reference}-variance-report.pdf`,
    },
  );
}

export async function dryRunStockTakeImport(
  portal: StockTakePortal,
  reference: string,
  body: StockTakeImportDryRunRequest,
): Promise<StockTakeImportDryRunResponse> {
  return fetchJson<StockTakeImportDryRunResponse>(
    `/api/${portal}/stock-takes/${encodeURIComponent(
      reference,
    )}/imports/dry-run`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function applyStockTakeImport(
  portal: StockTakePortal,
  reference: string,
  body: StockTakeApplyRequest,
): Promise<StockTakeApplyResponse> {
  return fetchJson<StockTakeApplyResponse>(
    `/api/${portal}/stock-takes/${encodeURIComponent(reference)}/apply`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}
