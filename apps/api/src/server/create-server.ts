import Fastify from "fastify";
import { registerHealthRoutes } from "../modules/system/health/health.routes.js";
import { registerErrorHandling } from "./register-error-handling.js";

export function createServer() {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  registerErrorHandling(server);
  registerHealthRoutes(server);

  return server;
}
