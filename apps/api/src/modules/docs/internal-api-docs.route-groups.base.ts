import { assignmentRoutes } from "../assignments/stock-assignment-route-support.js";
import { posSaleRoutes } from "../sales/pos-sale-route-definitions.js";
import type { InternalApiDocRoute } from "./internal-api-docs.catalog.js";
import { internalApiDocSchemas } from "./internal-api-docs.schemas.js";

const route = (definition: InternalApiDocRoute) => definition;

export const authRoutes: readonly InternalApiDocRoute[] = [
  route({
    access: { kind: "authenticated" },
    description:
      "Returns the signed-in user profile and current session context.",
    method: "GET",
    schemas: internalApiDocSchemas.authMe,
    summary: "Get current session user",
    tag: "Auth",
    url: "/api/auth/me",
  }),
  route({
    access: { kind: "authenticated" },
    description:
      "Returns the resolved permission set and visible location scopes for the signed-in user.",
    method: "GET",
    schemas: internalApiDocSchemas.authPermissionSet,
    summary: "Get current permission set",
    tag: "Auth",
    url: "/api/auth/me/permissions",
  }),
];

export const accessControlRoutes: readonly InternalApiDocRoute[] = [
  route({
    access: {
      kind: "permission",
      permission: "access.permissions.view",
      scope: "any_active",
    },
    description:
      "Lists the canonical permission catalogue used across the platform.",
    method: "GET",
    schemas: internalApiDocSchemas.accessPermissionList,
    summary: "List permissions",
    tag: "Access Control",
    url: "/api/admin/access/permissions",
  }),
  route({
    access: {
      kind: "permission",
      permission: "access.roles.view",
      scope: "any_active",
    },
    description: "Lists configured access roles with assignment coverage.",
    method: "GET",
    schemas: internalApiDocSchemas.accessRoleList,
    summary: "List roles",
    tag: "Access Control",
    url: "/api/admin/access/roles",
  }),
  route({
    access: {
      kind: "permission",
      permission: "access.audit.view",
      scope: "any_active",
    },
    description: "Lists append-only access-control audit events.",
    method: "GET",
    schemas: internalApiDocSchemas.accessAuditList,
    summary: "List access audit events",
    tag: "Access Control",
    url: "/api/admin/access/audit",
  }),
];

export const notificationRoutes: readonly InternalApiDocRoute[] = [
  route({
    access: {
      kind: "permission",
      permission: "api.docs.view",
      scope: "any_active",
    },
    description: "Returns the protected internal API reference document.",
    method: "GET",
    summary: "Get internal API spec",
    tag: "Internal Docs",
    url: "/api/internal/docs/openapi.json",
  }),
  route({
    access: { kind: "authenticated" },
    description: "Lists operational notifications for the signed-in user.",
    method: "GET",
    schemas: internalApiDocSchemas.notificationList,
    summary: "List notifications",
    tag: "Notifications",
    url: "/api/notifications",
  }),
  route({
    access: { kind: "authenticated" },
    description: "Marks every visible notification as read.",
    method: "PATCH",
    schemas: internalApiDocSchemas.markAllNotificationsRead,
    summary: "Mark all notifications read",
    tag: "Notifications",
    url: "/api/notifications/read-all",
  }),
  route({
    access: { kind: "authenticated" },
    description: "Marks one notification as read.",
    method: "PATCH",
    schemas: internalApiDocSchemas.markNotificationRead,
    summary: "Mark notification read",
    tag: "Notifications",
    url: "/api/notifications/:notificationKey/read",
  }),
  route({
    access: { kind: "authenticated" },
    description: "Deletes one notification from the signed-in user feed.",
    method: "DELETE",
    summary: "Delete notification",
    tag: "Notifications",
    url: "/api/notifications/:notificationKey",
  }),
];

export const assignmentDocRoutes: readonly InternalApiDocRoute[] = [
  route({
    access: assignmentRoutes.workerList.access,
    description:
      "Lists the current worker's assigned variants for one location.",
    method: assignmentRoutes.workerList.method,
    schemas: internalApiDocSchemas.workerListAssignments,
    summary: "List worker assignments",
    tag: "Assignments",
    url: assignmentRoutes.workerList.url,
  }),
  route({
    access: assignmentRoutes.managerList.access,
    description: "Lists active worker assignments for a managed location.",
    method: assignmentRoutes.managerList.method,
    schemas: internalApiDocSchemas.managerListAssignments,
    summary: "List location assignments",
    tag: "Assignments",
    url: assignmentRoutes.managerList.url,
  }),
  route({
    access: assignmentRoutes.managerAssign.access,
    description:
      "Assigns one product variant to a worker at a managed location.",
    method: assignmentRoutes.managerAssign.method,
    schemas: internalApiDocSchemas.managerAssign,
    summary: "Assign variant to worker",
    tag: "Assignments",
    url: assignmentRoutes.managerAssign.url,
  }),
  route({
    access: assignmentRoutes.managerBatchAssign.access,
    description: "Assigns multiple variants to one worker in a single request.",
    method: assignmentRoutes.managerBatchAssign.method,
    schemas: internalApiDocSchemas.managerBatchAssign,
    summary: "Batch assign variants",
    tag: "Assignments",
    url: assignmentRoutes.managerBatchAssign.url,
  }),
  route({
    access: assignmentRoutes.managerReassign.access,
    description: "Moves one assigned variant from one worker to another.",
    method: assignmentRoutes.managerReassign.method,
    schemas: internalApiDocSchemas.reassignVariant,
    summary: "Reassign variant",
    tag: "Assignments",
    url: assignmentRoutes.managerReassign.url,
  }),
];

export const salesDocRoutes: readonly InternalApiDocRoute[] = [
  route({
    access: posSaleRoutes.workerProcessSale.access,
    description:
      "Processes a worker POS sale and creates the resulting invoice.",
    method: posSaleRoutes.workerProcessSale.method,
    schemas: internalApiDocSchemas.workerProcessSale,
    summary: "Process worker sale",
    tag: "Sales",
    url: posSaleRoutes.workerProcessSale.url,
  }),
  route({
    access: posSaleRoutes.workerListSales.access,
    description: "Lists worker-visible sales for a selected location.",
    method: posSaleRoutes.workerListSales.method,
    schemas: internalApiDocSchemas.workerListSales,
    summary: "List worker sales",
    tag: "Sales",
    url: posSaleRoutes.workerListSales.url,
  }),
  route({
    access: posSaleRoutes.workerGetSale.access,
    description:
      "Fetches one worker-visible sales document by public reference.",
    method: posSaleRoutes.workerGetSale.method,
    schemas: internalApiDocSchemas.workerGetSale,
    summary: "Get worker sale",
    tag: "Sales",
    url: posSaleRoutes.workerGetSale.url,
  }),
  route({
    access: posSaleRoutes.workerReturnSale.access,
    description: "Processes a worker return and creates the credit note.",
    method: posSaleRoutes.workerReturnSale.method,
    schemas: internalApiDocSchemas.workerReturnSale,
    summary: "Return worker sale",
    tag: "Sales",
    url: posSaleRoutes.workerReturnSale.url,
  }),
  route({
    access: posSaleRoutes.managerListSales.access,
    description: "Lists managed-location sales for reporting and operations.",
    method: posSaleRoutes.managerListSales.method,
    schemas: internalApiDocSchemas.managerListSales,
    summary: "List manager sales",
    tag: "Sales",
    url: posSaleRoutes.managerListSales.url,
  }),
  route({
    access: posSaleRoutes.managerGetSale.access,
    description: "Fetches one managed sales document by public reference.",
    method: posSaleRoutes.managerGetSale.method,
    schemas: internalApiDocSchemas.managerGetSale,
    summary: "Get manager sale",
    tag: "Sales",
    url: posSaleRoutes.managerGetSale.url,
  }),
];
