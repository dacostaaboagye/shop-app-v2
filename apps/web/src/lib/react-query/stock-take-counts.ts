import {
  type StockTakeLineCountUpdateRequest,
  type StockTakeLineCountUpdateResponse,
  stockTakeLineCountUpdateResponseSchema,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";
import type { StockTakePortal } from "@/lib/react-query/stock-takes";

export type {
  StockTakeLineCountEntry,
  StockTakeLineCountUpdateRequest,
  StockTakeLineCountUpdateResponse,
} from "@shop/contracts";

export async function updateStockTakeLineCounts(
  portal: StockTakePortal,
  reference: string,
  body: StockTakeLineCountUpdateRequest,
): Promise<StockTakeLineCountUpdateResponse> {
  const response = await fetchJson<unknown>(
    `/api/${portal}/stock-takes/${encodeURIComponent(reference)}/lines`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );

  return stockTakeLineCountUpdateResponseSchema.parse(response);
}
