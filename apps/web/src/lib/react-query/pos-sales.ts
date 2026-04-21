import type {
  InvoiceListResponse,
  InvoiceResponse,
  ProcessPosPaymentRequest,
  ProcessPosReturnRequest,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export type InvoiceListQuery = {
  dateFrom?: string;
  dateTo?: string;
  documentType?: "all" | "credit_note" | "invoice";
  locationId: string;
  page?: number;
  pageSize?: number;
  workerId?: string;
};

export const workerSalesQueryKey = (query: Partial<InvoiceListQuery>) =>
  ["sales", "worker", query] as const;

export const managerSalesQueryKey = (query: Partial<InvoiceListQuery>) =>
  ["sales", "manager", query] as const;

export const invoiceQueryKey = (reference: string) =>
  ["sales", "invoice", reference] as const;

export async function fetchWorkerSales(
  query: InvoiceListQuery,
): Promise<InvoiceListResponse> {
  const params = new URLSearchParams({
    locationId: query.locationId,
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 25),
  });
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.documentType && query.documentType !== "all") {
    params.set("documentType", query.documentType);
  }

  return fetchJson<InvoiceListResponse>(
    `/api/worker/sales?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManagerSales(
  query: InvoiceListQuery,
): Promise<InvoiceListResponse> {
  const params = new URLSearchParams({
    locationId: query.locationId,
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 25),
  });
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.documentType && query.documentType !== "all") {
    params.set("documentType", query.documentType);
  }
  if (query.workerId) params.set("workerId", query.workerId);

  return fetchJson<InvoiceListResponse>(
    `/api/manager/sales?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchWorkerInvoice(
  reference: string,
): Promise<InvoiceResponse> {
  return fetchJson<InvoiceResponse>(
    `/api/worker/sales/${encodeURIComponent(reference)}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManagerInvoice(
  reference: string,
): Promise<InvoiceResponse> {
  return fetchJson<InvoiceResponse>(
    `/api/manager/sales/${encodeURIComponent(reference)}`,
    undefined,
    { auth: "required" },
  );
}

export async function postWorkerSale(
  body: ProcessPosPaymentRequest,
): Promise<InvoiceResponse> {
  return fetchJson<InvoiceResponse>(
    "/api/worker/sales",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function postWorkerReturn(
  reference: string,
  body: ProcessPosReturnRequest,
): Promise<InvoiceResponse> {
  return fetchJson<InvoiceResponse>(
    `/api/worker/sales/${encodeURIComponent(reference)}/return`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}
