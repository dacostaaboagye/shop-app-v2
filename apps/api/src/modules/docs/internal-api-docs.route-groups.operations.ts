import { supplyRequestRoutes } from "../stock/supply-request-route-support.js";
import type { InternalApiDocRoute } from "./internal-api-docs.catalog.js";
import { internalApiDocSchemas } from "./internal-api-docs.schemas.js";

const route = (definition: InternalApiDocRoute) => definition;

export const dashboardRoutes: readonly InternalApiDocRoute[] = [
  route({
    access: {
      kind: "permission",
      permission: "stock.view",
      scope: "any_active",
    },
    description:
      "Returns the manager dashboard business summary for one location.",
    method: "GET",
    schemas: internalApiDocSchemas.managerDashboardSummary,
    summary: "Get manager dashboard summary",
    tag: "Dashboards",
    url: "/api/manager/dashboard/summary",
  }),
  route({
    access: {
      kind: "permission",
      permission: "stock.assignments.own.view",
      scope: "any_active",
    },
    description:
      "Returns the worker dashboard business summary for one location.",
    method: "GET",
    schemas: internalApiDocSchemas.workerDashboardSummary,
    summary: "Get worker dashboard summary",
    tag: "Dashboards",
    url: "/api/worker/dashboard/summary",
  }),
];

export const stockRoutes: readonly InternalApiDocRoute[] = [
  route({
    access: {
      kind: "permission",
      permission: "stock.view",
      scope: "any_active",
    },
    description: "Lists stock balances for one managed location.",
    method: "GET",
    schemas: internalApiDocSchemas.managerStockBalances,
    summary: "List manager stock balances",
    tag: "Stock",
    url: "/api/manager/stock/balances",
  }),
  route({
    access: {
      kind: "permission",
      permission: "worker.stock.view",
      scope: "any_active",
    },
    description: "Lists stock balances visible to a worker at one location.",
    method: "GET",
    schemas: internalApiDocSchemas.workerStockBalances,
    summary: "List worker stock balances",
    tag: "Stock",
    url: "/api/worker/stock/balances",
  }),
];

export const supplyRequestDocRoutes: readonly InternalApiDocRoute[] = [
  route({
    access: supplyRequestRoutes.managerList.access,
    description:
      "Lists transfer and supply requests involving one managed location.",
    method: supplyRequestRoutes.managerList.method,
    schemas: internalApiDocSchemas.supplyRequestList,
    summary: "List manager supply requests",
    tag: "Supply Requests",
    url: supplyRequestRoutes.managerList.url,
  }),
  route({
    access: supplyRequestRoutes.managerIncoming.access,
    description:
      "Lists supply requests awaiting action from managed source locations.",
    method: supplyRequestRoutes.managerIncoming.method,
    schemas: internalApiDocSchemas.supplyRequestList,
    summary: "List incoming manager supply requests",
    tag: "Supply Requests",
    url: supplyRequestRoutes.managerIncoming.url,
  }),
  route({
    access: supplyRequestRoutes.managerCreate.access,
    description: "Creates one managed-location supply request.",
    method: supplyRequestRoutes.managerCreate.method,
    schemas: internalApiDocSchemas.supplyRequestCreate,
    summary: "Create manager supply request",
    tag: "Supply Requests",
    url: supplyRequestRoutes.managerCreate.url,
  }),
  route({
    access: supplyRequestRoutes.managerApprove.access,
    description: "Approves a supply request from a managed source location.",
    method: supplyRequestRoutes.managerApprove.method,
    schemas: internalApiDocSchemas.supplyRequestApprove,
    summary: "Approve supply request",
    tag: "Supply Requests",
    url: supplyRequestRoutes.managerApprove.url,
  }),
  route({
    access: supplyRequestRoutes.managerDispatch.access,
    description: "Dispatches approved goods and creates the GTN.",
    method: supplyRequestRoutes.managerDispatch.method,
    schemas: internalApiDocSchemas.supplyRequestDispatch,
    summary: "Dispatch supply request",
    tag: "Supply Requests",
    url: supplyRequestRoutes.managerDispatch.url,
  }),
  route({
    access: supplyRequestRoutes.workerList.access,
    description: "Lists worker-visible supply requests.",
    method: supplyRequestRoutes.workerList.method,
    schemas: internalApiDocSchemas.supplyRequestList,
    summary: "List worker supply requests",
    tag: "Supply Requests",
    url: supplyRequestRoutes.workerList.url,
  }),
  route({
    access: supplyRequestRoutes.workerCreate.access,
    description: "Creates one worker supply request.",
    method: supplyRequestRoutes.workerCreate.method,
    schemas: internalApiDocSchemas.supplyRequestCreate,
    summary: "Create worker supply request",
    tag: "Supply Requests",
    url: supplyRequestRoutes.workerCreate.url,
  }),
];
