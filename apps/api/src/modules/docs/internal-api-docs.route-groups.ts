import type { InternalApiDocRoute } from "./internal-api-docs.catalog.js";
import {
  accessControlRoutes,
  assignmentDocRoutes,
  authRoutes,
  notificationRoutes,
  salesDocRoutes,
} from "./internal-api-docs.route-groups.base.js";
import {
  dashboardRoutes,
  stockRoutes,
  supplyRequestDocRoutes,
} from "./internal-api-docs.route-groups.operations.js";

export const internalApiDocRouteGroups: readonly (readonly InternalApiDocRoute[])[] =
  [
    authRoutes,
    accessControlRoutes,
    notificationRoutes,
    assignmentDocRoutes,
    salesDocRoutes,
    dashboardRoutes,
    stockRoutes,
    supplyRequestDocRoutes,
  ];
