import type { AdminInvoiceListQuery } from "./pos-sales";

export function buildAdminInvoiceSearchParams(query: AdminInvoiceListQuery) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 25),
  });

  if (query.channel && query.channel !== "all") {
    params.set("channel", query.channel);
  }
  if (query.currentPayableOnly) {
    params.set("currentPayableOnly", "true");
  }
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.classification && query.classification !== "all") {
    params.set("classification", query.classification);
  }
  if (query.documentType && query.documentType !== "all") {
    params.set("documentType", query.documentType);
  }
  if (query.locationId) params.set("locationId", query.locationId);
  if (query.q) params.set("q", query.q);
  if (query.status && query.status !== "all") {
    params.set("status", query.status);
  }
  if (query.workerId) params.set("workerId", query.workerId);

  return params;
}
