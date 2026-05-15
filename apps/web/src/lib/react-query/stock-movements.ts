import type {
  AdminStockMovementQuery,
  ManagerStockMovementQuery,
  StockMovementListResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminStockMovementsQueryKey = (
  query: Partial<AdminStockMovementQuery>,
) => ["stock", "movements", "admin", query] as const;

export const managerStockMovementsQueryKey = (
  query: Partial<ManagerStockMovementQuery>,
) => ["stock", "movements", "manager", query] as const;

export async function fetchAdminStockMovements(
  query: AdminStockMovementQuery,
): Promise<StockMovementListResponse> {
  return fetchJson<StockMovementListResponse>(
    `/api/admin/stock/movements?${toMovementParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManagerStockMovements(
  query: ManagerStockMovementQuery,
): Promise<StockMovementListResponse> {
  return fetchJson<StockMovementListResponse>(
    `/api/manager/stock/movements?${toMovementParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

function toMovementParams(
  query: AdminStockMovementQuery | ManagerStockMovementQuery,
) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });

  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.locationSlug) params.set("locationSlug", query.locationSlug);
  if (query.movementType) params.set("movementType", query.movementType);
  if (query.q) params.set("q", query.q);
  if (query.sku) params.set("sku", query.sku);
  if (query.sourceType) params.set("sourceType", query.sourceType);

  return params;
}
