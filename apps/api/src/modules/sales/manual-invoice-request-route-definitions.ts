import type { RouteDefinition } from "../_core/route-contract.js";

function manualInvoiceRoute(
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

export const manualInvoiceRequestRoutes = {
  adminApprove: manualInvoiceRoute(
    "POST",
    "/api/admin/invoices/manual-requests/:reference/approve",
    "invoices.manual.approve",
  ),
  adminGet: manualInvoiceRoute(
    "GET",
    "/api/admin/invoices/manual-requests/:reference",
    "invoices.manual.view",
  ),
  adminList: manualInvoiceRoute(
    "GET",
    "/api/admin/invoices/manual-requests",
    "invoices.manual.view",
  ),
  adminReject: manualInvoiceRoute(
    "POST",
    "/api/admin/invoices/manual-requests/:reference/reject",
    "invoices.manual.approve",
  ),
  managerCreate: manualInvoiceRoute(
    "POST",
    "/api/manager/invoices/manual-requests",
    "invoices.manual.request",
  ),
  managerGet: manualInvoiceRoute(
    "GET",
    "/api/manager/invoices/manual-requests/:reference",
    "invoices.manual.view",
  ),
  managerList: manualInvoiceRoute(
    "GET",
    "/api/manager/invoices/manual-requests",
    "invoices.manual.view",
  ),
} satisfies Record<string, RouteDefinition>;
