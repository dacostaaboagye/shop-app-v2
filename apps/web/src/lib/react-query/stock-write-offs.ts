import type {
  StockWriteOffRequest,
  StockWriteOffResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export async function postAdminStockWriteOff(
  body: StockWriteOffRequest,
): Promise<StockWriteOffResponse> {
  return fetchJson<StockWriteOffResponse>(
    "/api/admin/stock/balances/write-off",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postManagerStockWriteOff(
  body: StockWriteOffRequest,
): Promise<StockWriteOffResponse> {
  return fetchJson<StockWriteOffResponse>(
    "/api/manager/stock/balances/write-off",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}
