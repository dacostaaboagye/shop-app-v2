import type {
  ApproveStockSupplyRequest,
  ConfirmReceipt,
  CreateStockSupplyRequest,
  DispatchStockSupplyRequest,
  GtnResponse,
  RejectStockSupplyRequest,
  StockSupplyRequestListResponse,
  StockSupplyRequestResponse,
  SupplyRequestSourceListResponse,
  SupplyRequestStatus,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export type SupplyRequestListQuery = {
  locationId?: string;
  sourceLocationId?: string;
  page?: number;
  pageSize?: number;
  status?: SupplyRequestStatus;
};

export const workerSupplyRequestsQueryKey = (query: SupplyRequestListQuery) =>
  ["supply-requests", "worker", query] as const;

export const managerIncomingSupplyRequestsQueryKey = (
  query: SupplyRequestListQuery,
) => ["supply-requests", "manager-incoming", query] as const;

export const managerSupplyRequestsQueryKey = (query: SupplyRequestListQuery) =>
  ["supply-requests", "manager-location", query] as const;

export const gtnQueryKey = (id: string) => ["gtn", id] as const;

export const supplyRequestSourcesQueryKey = (destinationLocationId: string) =>
  ["supply-request-sources", destinationLocationId] as const;

export async function fetchSupplyRequestSources(
  destinationLocationId: string,
): Promise<SupplyRequestSourceListResponse> {
  const params = new URLSearchParams({ destinationLocationId });
  return fetchJson<SupplyRequestSourceListResponse>(
    `/api/worker/stock/supply-request-sources?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchWorkerSupplyRequests(
  query: SupplyRequestListQuery,
): Promise<StockSupplyRequestListResponse> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 25),
  });
  if (query.status) params.set("status", query.status);

  return fetchJson<StockSupplyRequestListResponse>(
    `/api/worker/stock/supply-requests?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManagerIncomingSupplyRequests(
  query: SupplyRequestListQuery & { sourceLocationId: string },
): Promise<StockSupplyRequestListResponse> {
  const params = new URLSearchParams({
    sourceLocationId: query.sourceLocationId,
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 25),
  });
  if (query.status) params.set("status", query.status);

  return fetchJson<StockSupplyRequestListResponse>(
    `/api/manager/stock/supply-requests/incoming?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManagerSupplyRequests(
  query: SupplyRequestListQuery & { locationId: string },
): Promise<StockSupplyRequestListResponse> {
  const params = new URLSearchParams({
    locationId: query.locationId,
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 25),
  });
  if (query.status) params.set("status", query.status);

  return fetchJson<StockSupplyRequestListResponse>(
    `/api/manager/stock/supply-requests?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchGtn(id: string): Promise<GtnResponse> {
  return fetchJson<GtnResponse>(
    `/api/stock/gtns/${encodeURIComponent(id)}`,
    undefined,
    { auth: "required" },
  );
}

export async function postWorkerSupplyRequest(
  body: CreateStockSupplyRequest,
): Promise<StockSupplyRequestResponse> {
  return fetchJson<StockSupplyRequestResponse>(
    "/api/worker/stock/supply-requests",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function patchWorkerCancelSupplyRequest(
  id: string,
): Promise<StockSupplyRequestResponse> {
  return fetchJson<StockSupplyRequestResponse>(
    `/api/worker/stock/supply-requests/${encodeURIComponent(id)}/cancel`,
    { method: "PATCH" },
    { auth: "required" },
  );
}

export async function patchWorkerConfirmReceipt(
  id: string,
  body: ConfirmReceipt,
): Promise<StockSupplyRequestResponse> {
  return fetchJson<StockSupplyRequestResponse>(
    `/api/worker/stock/supply-requests/${encodeURIComponent(id)}/confirm-receipt`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

export async function patchManagerApproveSupplyRequest(
  id: string,
  body: ApproveStockSupplyRequest,
): Promise<StockSupplyRequestResponse> {
  return fetchJson<StockSupplyRequestResponse>(
    `/api/manager/stock/supply-requests/${encodeURIComponent(id)}/approve`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

export async function patchManagerRejectSupplyRequest(
  id: string,
  body: RejectStockSupplyRequest,
): Promise<StockSupplyRequestResponse> {
  return fetchJson<StockSupplyRequestResponse>(
    `/api/manager/stock/supply-requests/${encodeURIComponent(id)}/reject`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

export async function patchManagerDispatch(
  id: string,
  body: DispatchStockSupplyRequest,
): Promise<{ supplyRequest: StockSupplyRequestResponse; gtn: GtnResponse }> {
  return fetchJson<{
    supplyRequest: StockSupplyRequestResponse;
    gtn: GtnResponse;
  }>(
    `/api/manager/stock/supply-requests/${encodeURIComponent(id)}/dispatch`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}
