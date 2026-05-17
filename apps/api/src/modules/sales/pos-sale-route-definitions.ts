import type { RouteDefinition } from "../_core/route-contract.js";

function posSaleRoute(
  method: RouteDefinition["method"],
  url: string,
  permission: string,
): RouteDefinition {
  return {
    access: { kind: "permission", permission, scope: "any_active" },
    method,
    url,
  };
}

function authenticatedPosSaleRoute(
  method: RouteDefinition["method"],
  url: string,
): RouteDefinition {
  return {
    access: { kind: "authenticated" },
    method,
    url,
  };
}

export const posSaleRoutes = {
  adminExportInvoices: posSaleRoute(
    "GET",
    "/api/admin/invoices/export.csv",
    "admin.dashboard.view",
  ),
  adminGetInvoice: posSaleRoute(
    "GET",
    "/api/admin/invoices/:reference",
    "admin.dashboard.view",
  ),
  adminListInvoices: posSaleRoute(
    "GET",
    "/api/admin/invoices",
    "admin.dashboard.view",
  ),
  managerGetSale: posSaleRoute(
    "GET",
    "/api/manager/sales/:reference",
    "pos.sales.manage",
  ),
  managerListSales: posSaleRoute(
    "GET",
    "/api/manager/sales",
    "pos.sales.manage",
  ),
  workerGetSale: authenticatedPosSaleRoute(
    "GET",
    "/api/worker/sales/:reference",
  ),
  workerListSales: authenticatedPosSaleRoute("GET", "/api/worker/sales"),
  workerProcessSale: posSaleRoute(
    "POST",
    "/api/worker/sales",
    "pos.sales.process",
  ),
  workerReturnSale: posSaleRoute(
    "POST",
    "/api/worker/sales/:reference/return",
    "pos.sales.process",
  ),
} satisfies Record<string, RouteDefinition>;
