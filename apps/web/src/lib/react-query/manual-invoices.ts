import type {
  CreateManualInvoiceRequest,
  DecideManualInvoiceRequest,
  ManagerCustomerLookupQuery,
  ManagerCustomerLookupResponse,
  ManualInvoiceRequestListQuery,
  ManualInvoiceRequestListResponse,
  ManualInvoiceRequestResponse,
  RejectManualInvoiceRequest,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export type ManualInvoiceScope = "admin" | "manager";

export const manualInvoiceRequestsQueryKey = (
  scope: ManualInvoiceScope,
  query: ManualInvoiceRequestListQuery,
) => ["manual-invoice-requests", scope, query] as const;

export const manualInvoiceRequestQueryKey = (
  scope: ManualInvoiceScope,
  reference: string,
) => ["manual-invoice-request", scope, reference] as const;

export const managerCustomerLookupQueryKey = (
  query: ManagerCustomerLookupQuery,
) => ["manager", "customers", query] as const;

function buildManualInvoiceRequestParams(query: ManualInvoiceRequestListQuery) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 25),
    status: query.status ?? "all",
  });
  if (query.locationId) params.set("locationId", query.locationId);
  if (query.q) params.set("q", query.q);
  return params;
}

function basePath(scope: ManualInvoiceScope) {
  return scope === "admin"
    ? "/api/admin/invoices/manual-requests"
    : "/api/manager/invoices/manual-requests";
}

export async function fetchManualInvoiceRequests(
  scope: ManualInvoiceScope,
  query: ManualInvoiceRequestListQuery,
): Promise<ManualInvoiceRequestListResponse> {
  return fetchJson<ManualInvoiceRequestListResponse>(
    `${basePath(scope)}?${buildManualInvoiceRequestParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManualInvoiceRequest(
  scope: ManualInvoiceScope,
  reference: string,
): Promise<ManualInvoiceRequestResponse> {
  return fetchJson<ManualInvoiceRequestResponse>(
    `${basePath(scope)}/${encodeURIComponent(reference)}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManagerCustomerLookup(
  query: ManagerCustomerLookupQuery,
): Promise<ManagerCustomerLookupResponse> {
  const params = new URLSearchParams({
    limit: String(query.limit),
    q: query.q,
  });
  return fetchJson<ManagerCustomerLookupResponse>(
    `/api/manager/customers?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function createManagerManualInvoiceRequest(
  body: CreateManualInvoiceRequest,
): Promise<ManualInvoiceRequestResponse> {
  return fetchJson<ManualInvoiceRequestResponse>(
    basePath("manager"),
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function approveManualInvoiceRequest(
  reference: string,
  body: DecideManualInvoiceRequest,
): Promise<ManualInvoiceRequestResponse> {
  return fetchJson<ManualInvoiceRequestResponse>(
    `${basePath("admin")}/${encodeURIComponent(reference)}/approve`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function rejectManualInvoiceRequest(
  reference: string,
  body: RejectManualInvoiceRequest,
): Promise<ManualInvoiceRequestResponse> {
  return fetchJson<ManualInvoiceRequestResponse>(
    `${basePath("admin")}/${encodeURIComponent(reference)}/reject`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}
