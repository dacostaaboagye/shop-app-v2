import type { RouteAccess } from "../_core/route-contract.js";
import { internalApiDocRouteGroups } from "./internal-api-docs.route-groups.js";
import type { InternalApiDocSchemas } from "./internal-api-docs.schemas.js";

export type InternalApiDocRoute = {
  access: RouteAccess;
  description: string;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  schemas?: InternalApiDocSchemas;
  summary: string;
  tag: string;
  url: string;
};

export const INTERNAL_API_DOC_ROUTES: readonly InternalApiDocRoute[] =
  internalApiDocRouteGroups.flat();
