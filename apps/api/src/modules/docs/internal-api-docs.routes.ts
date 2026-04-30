import type { FastifyInstance } from "fastify";
import { getApiEnv } from "../../env.js";
import { INTERNAL_API_DOC_ROUTES } from "./internal-api-docs.catalog.js";
import { buildInternalOpenApiDocument } from "./internal-api-docs.support.js";

const internalApiDocument = buildInternalOpenApiDocument(
  INTERNAL_API_DOC_ROUTES,
);

const internalApiDocsAccess =
  getApiEnv().nodeEnv === "development"
    ? ({ kind: "authenticated" } as const)
    : ({
        kind: "permission",
        permission: "api.docs.view",
        scope: "any_active",
      } as const);

const internalApiDocsRoute = {
  access: internalApiDocsAccess,
  method: "GET" as const,
  url: "/api/internal/docs/openapi.json",
};

export const internalApiDocsRateLimit = {
  max: 20,
  timeWindow: "1 minute",
} as const;

export function registerInternalApiDocsRoutes(server: FastifyInstance) {
  server.route({
    config: {
      access: internalApiDocsRoute.access,
      rateLimit: internalApiDocsRateLimit,
    },
    method: internalApiDocsRoute.method,
    url: internalApiDocsRoute.url,
    async handler(_request, reply) {
      return reply
        .header("cache-control", "private, max-age=300")
        .type("application/json; charset=utf-8")
        .send(internalApiDocument);
    },
  });
}
