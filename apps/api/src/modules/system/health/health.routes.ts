import { healthResponseSchema } from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../../_core/route-contract.js";

const healthRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "GET",
  url: "/health",
};

export function registerHealthRoutes(server: FastifyInstance) {
  server.route({
    method: healthRoute.method,
    url: healthRoute.url,
    async handler() {
      return healthResponseSchema.parse({
        name: "shop-app-v2-api",
        status: "ok",
        utcTime: new Date().toISOString(),
      });
    },
  });
}
