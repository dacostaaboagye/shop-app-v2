import type {
  AdminInvoiceListResponse,
  InvoiceListResponse,
  InvoiceResponse,
  ProcessPosPaymentRequest,
  ProcessPosReturnRequest,
} from "@shop/contracts";
import { fetchFile } from "@/lib/react-query/fetch-file";
import { fetchJson } from "@/lib/react-query/fetch-json";
import { buildAdminInvoiceSearchParams } from "./pos-sales-admin.support";

export type InvoiceListQuery = {
  classification?: "all" | "internal" | "outgoing";
  dateFrom?: string;
  dateTo?: string;
  documentType?: "adjusted" | "all" | "credit_note" | "invoice";
  locationId: string;
  q?: string;
  page?: number;
  pageSize?: number;
  workerId?: string;
};

export type AdminInvoiceListQuery = Omit<InvoiceListQuery, "locationId"> & {
  channel?: "all" | "ecommerce" | "manual" | "portal" | "pos";
  currentPayableOnly?: boolean;
  locationId?: string;
  status?: "all" | "confirmed" | "superseded" | "voided";
};

export const workerSalesQueryKey = (query: Partial<InvoiceListQuery>) =>
  ["sales", "worker", query] as const;

export const managerSalesQueryKey = (query: Partial<InvoiceListQuery>) =>
  ["sales", "manager", query] as const;

export const adminInvoicesQueryKey = (query: Partial<AdminInvoiceListQuery>) =>
  ["sales", "admin-invoices", query] as const;

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
  if (query.classification && query.classification !== "all") {
    params.set("classification", query.classification);
  }
  if (query.documentType && query.documentType !== "all") {
    params.set("documentType", query.documentType);
  }
  if (query.q) params.set("q", query.q);

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
  if (query.classification && query.classification !== "all") {
    params.set("classification", query.classification);
  }
  if (query.documentType && query.documentType !== "all") {
    params.set("documentType", query.documentType);
  }
  if (query.q) params.set("q", query.q);
  if (query.workerId) params.set("workerId", query.workerId);

  return fetchJson<InvoiceListResponse>(
    `/api/manager/sales?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminInvoices(
  query: AdminInvoiceListQuery,
): Promise<AdminInvoiceListResponse> {
  return fetchJson<AdminInvoiceListResponse>(
    `/api/admin/invoices?${buildAdminInvoiceSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function downloadAdminInvoicesCsv(
  query: AdminInvoiceListQuery,
): Promise<File> {
  return fetchFile(
    `/api/admin/invoices/export.csv?${buildAdminInvoiceSearchParams(
      query,
    ).toString()}`,
    undefined,
    {
      auth: "required",
      fallbackFilename: "admin-invoices.csv",
    },
  );
}

export async function fetchAllManagerSales(
  query: InvoiceListQuery,
): Promise<InvoiceListResponse["items"]> {
  const firstPage = await fetchManagerSales({
    ...query,
    page: 1,
    pageSize: Math.min(query.pageSize ?? 100, 100),
  });

  const totalPages = Math.max(
    1,
    Math.ceil(firstPage.total / Math.max(firstPage.pageSize, 1)),
  );

  if (totalPages === 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchManagerSales({
        ...query,
        page: index + 2,
        pageSize: firstPage.pageSize,
      }),
    ),
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((response) => response.items),
  ];
}

export async function fetchAllWorkerSales(
  query: InvoiceListQuery,
): Promise<InvoiceListResponse["items"]> {
  const firstPage = await fetchWorkerSales({
    ...query,
    page: 1,
    pageSize: Math.min(query.pageSize ?? 100, 100),
  });

  const totalPages = Math.max(
    1,
    Math.ceil(firstPage.total / Math.max(firstPage.pageSize, 1)),
  );

  if (totalPages === 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchWorkerSales({
        ...query,
        page: index + 2,
        pageSize: firstPage.pageSize,
      }),
    ),
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((response) => response.items),
  ];
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

export async function fetchAdminInvoice(
  reference: string,
): Promise<InvoiceResponse> {
  return fetchJson<InvoiceResponse>(
    `/api/admin/invoices/${encodeURIComponent(reference)}`,
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
