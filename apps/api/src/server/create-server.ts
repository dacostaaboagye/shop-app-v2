import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { getApiEnv } from "../env.js";
import { registerRouteAuthorization } from "../modules/access-control/route-authorization.js";
import { registerAdminAccessRoutes } from "../modules/admin/admin-access.routes.js";
import { registerAdminDirectoryRoutes } from "../modules/admin/admin-directory.routes.js";
import { registerAdminLocationQueryRoutes } from "../modules/admin/admin-location-query.routes.js";
import { registerAdminLocationWriteRoutes } from "../modules/admin/admin-location-write.routes.js";
import { registerAdminUserAccessRoutes } from "../modules/admin/admin-user-access.routes.js";
import { registerAuthRoutes } from "../modules/auth/auth.routes.js";
import { registerStockRoutes } from "../modules/stock/active-reservation-admin.routes.js";
import { registerHealthRoutes } from "../modules/system/health/health.routes.js";
import { registerErrorHandling } from "./register-error-handling.js";

type CreateServerOptions = {
  accessControl?: Parameters<typeof registerRouteAuthorization>[1];
  adminAccess?: Parameters<typeof registerAdminAccessRoutes>[1];
  adminDirectory?: Parameters<typeof registerAdminDirectoryRoutes>[1];
  adminLocationQuery?: Parameters<typeof registerAdminLocationQueryRoutes>[1];
  adminLocationWrite?: Parameters<typeof registerAdminLocationWriteRoutes>[1];
  adminUserAccess?: Parameters<typeof registerAdminUserAccessRoutes>[1];
  auth?: Parameters<typeof registerAuthRoutes>[1];
  stock?: Parameters<typeof registerStockRoutes>[1];
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
  registerAdminDirectoryRoutes(server, options.adminDirectory);
  registerAdminAccessRoutes(server, options.adminAccess);
  registerAdminLocationQueryRoutes(server, options.adminLocationQuery);
  registerAdminLocationWriteRoutes(server, options.adminLocationWrite);
  registerAdminUserAccessRoutes(server, options.adminUserAccess);
  registerStockRoutes(server, options.stock);
  registerHealthRoutes(server);

  return server;
}
