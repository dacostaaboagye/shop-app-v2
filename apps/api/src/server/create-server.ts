import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { getApiEnv } from "../env.js";
import { registerRouteAuthorization } from "../modules/access-control/route-authorization.js";
import { registerAuthRoutes } from "../modules/auth/auth.routes.js";
import { registerHealthRoutes } from "../modules/system/health/health.routes.js";
import { registerErrorHandling } from "./register-error-handling.js";

type CreateServerOptions = {
  accessControl?: Parameters<typeof registerRouteAuthorization>[1];
  auth?: Parameters<typeof registerAuthRoutes>[1];
};

export function createServer(options: CreateServerOptions = {}) {
  const env = getApiEnv();
  const server = Fastify({
    logger: {
      level: env.nodeEnv === "development" ? "info" : "warn",
    },
  });

  server.register(cookie);
  server.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin || !env.webBaseUrl) {
        callback(null, true);
        return;
      }

      callback(null, origin === env.webBaseUrl);
    },
  });
  registerErrorHandling(server);
  registerRouteAuthorization(server, options.accessControl);
  registerAuthRoutes(server, options.auth);
  registerHealthRoutes(server);

  return server;
}
