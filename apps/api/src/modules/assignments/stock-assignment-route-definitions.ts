import type { RouteDefinition } from "../_core/route-contract.js";

export const assignmentRoutes = {
  managerAssign: assignmentRoute(
    "POST",
    "/api/manager/assignments",
    "stock.assignments.manage",
  ),
  managerBatchAssign: assignmentRoute(
    "POST",
    "/api/manager/assignments/batch",
    "stock.assignments.manage",
  ),
  managerHistory: assignmentRoute(
    "GET",
    "/api/manager/assignments/history",
    "stock.assignments.view",
  ),
  managerHandoverList: assignmentRoute(
    "GET",
    "/api/manager/handovers",
    "stock.assignments.view",
  ),
  managerInitiateHandover: assignmentRoute(
    "POST",
    "/api/manager/handovers",
    "stock.assignments.manage",
  ),
  managerList: assignmentRoute(
    "GET",
    "/api/manager/assignments",
    "stock.assignments.view",
  ),
  managerReassign: assignmentRoute(
    "POST",
    "/api/manager/assignments/reassign",
    "stock.assignments.manage",
  ),
  managerRevertHandover: assignmentRoute(
    "POST",
    "/api/manager/handovers/revert",
    "stock.assignments.manage",
  ),
  workerHistory: assignmentRoute(
    "GET",
    "/api/worker/assignments/history",
    "stock.assignments.own.view",
  ),
  workerHandoverList: assignmentRoute(
    "GET",
    "/api/worker/handovers",
    "stock.handovers.manage",
  ),
  workerHandoverRecipients: assignmentRoute(
    "GET",
    "/api/worker/handovers/recipients",
    "stock.handovers.manage",
  ),
  workerInitiateHandover: assignmentRoute(
    "POST",
    "/api/worker/handovers",
    "stock.handovers.manage",
  ),
  workerList: assignmentRoute(
    "GET",
    "/api/worker/assignments",
    "stock.assignments.own.view",
  ),
  workerRevertHandover: assignmentRoute(
    "POST",
    "/api/worker/handovers/revert",
    "stock.handovers.manage",
  ),
} satisfies Record<string, RouteDefinition>;

function assignmentRoute(
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
