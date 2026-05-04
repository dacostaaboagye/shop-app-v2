import { fetchFile } from "@/lib/react-query/fetch-file";
import { fetchJson } from "@/lib/react-query/fetch-json";

export type StockTakePortal = "admin" | "manager";
export type StockTakeMode = "blind" | "assisted";
export type StockTakeStatus =
  | "generated"
  | "counted"
  | "reviewed"
  | "applied"
  | "cancelled";

export type CreateStockTakeRequest = {
  locationSlug: string;
  mode: StockTakeMode;
};

export type StockTakeSheetResponse = {
  blankSheet: boolean;
  generatedAt: string;
  generatedByUserSlug: string | null;
  lineCount: number;
  locationName: string;
  locationSlug: string;
  mode: StockTakeMode;
  printableBookletUrl: string;
  sheetCsvUrl: string;
  status: StockTakeStatus;
  stockTakeReference: string;
};

export type StockTakeLine = {
  availableQuantity?: number;
  barcode?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  countedQuantity?: number | null;
  expectedQuantity?: number | null;
  lineNumber: number;
  note?: string | null;
  productName: string;
  productSlug?: string | null;
  reservedQuantity?: number;
  rowStatus?: "catalog_sku" | "manual_blank" | "counted" | "skipped";
  sku: string;
  systemOnHand?: number;
  unitOfMeasure?: string | null;
  variance?: number | null;
  variantName?: string | null;
  variantSlug?: string | null;
};

export type StockTakeDetailResponse = StockTakeSheetResponse & {
  lines: StockTakeLine[];
};

export const stockTakeQueryKey = (portal: StockTakePortal, reference: string) =>
  ["stock-takes", portal, reference] as const;

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
