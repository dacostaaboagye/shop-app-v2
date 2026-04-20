import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { getApiEnv } from "../env.js";
import { registerRouteAuthorization } from "../modules/access-control/route-authorization.js";
import { registerAdminAccessRoutes } from "../modules/admin/admin-access.routes.js";
import { registerAdminDirectoryRoutes } from "../modules/admin/admin-directory.routes.js";
import { registerAdminLocationQueryRoutes } from "../modules/admin/admin-location-query.routes.js";
import { registerAdminLocationWriteRoutes } from "../modules/admin/admin-location-write.routes.js";
import { registerAdminUserAccessRoutes } from "../modules/admin/admin-user-access.routes.js";
import { registerManagerStaffRoutes } from "../modules/assignments/manager-staff.routes.js";
import { registerStockAssignmentRoutes } from "../modules/assignments/stock-assignment.routes.js";
import { registerAuthRoutes } from "../modules/auth/auth.routes.js";
import { registerCatalogProductOptionsRoutes } from "../modules/catalog/catalog-admin-product-options.routes.js";
import { registerCatalogAdminQueryRoutes } from "../modules/catalog/catalog-admin-query.routes.js";
import { registerCatalogAdminWriteRoutes } from "../modules/catalog/catalog-admin-write.routes.js";
import { registerCatalogBrandRoutes } from "../modules/catalog/catalog-brand.routes.js";
import { registerCatalogManagerQueryRoutes } from "../modules/catalog/catalog-manager-query.routes.js";
import { registerCatalogMediaRoutes } from "../modules/catalog/catalog-media.routes.js";
import { registerPlatformEventAdminRoutes } from "../modules/events/platform-event-admin.routes.js";
import { registerPlatformEventRoutes } from "../modules/events/platform-events.routes.js";
import { registerNotificationRoutes } from "../modules/notifications/notification.routes.js";
import { registerIssuedDocumentRoutes } from "../modules/official-documents/issued-document.routes.js";
import { registerOfficialDocumentSettingsRoutes } from "../modules/official-documents/official-document-settings.routes.js";
import { registerPosSaleRoutes } from "../modules/sales/pos-sale.routes.js";
import { registerStockRoutes } from "../modules/stock/active-reservation-admin.routes.js";
import { registerStockBalanceRoutes } from "../modules/stock/stock-balance-admin.routes.js";
import { registerStockBalanceLocationRoutes } from "../modules/stock/stock-balance-location.routes.js";
import { registerStockCountRoutes } from "../modules/stock/stock-count-admin.routes.js";
import { registerStockSupplyRoutes } from "../modules/stock/supply-request.routes.js";
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
  catalogManagerQuery?: Parameters<typeof registerCatalogManagerQueryRoutes>[1];
  catalogBrands?: Parameters<typeof registerCatalogBrandRoutes>[1];
  catalogMedia?: Parameters<typeof registerCatalogMediaRoutes>[1];
  events?: Parameters<typeof registerPlatformEventRoutes>[1];
  eventsAdmin?: Parameters<typeof registerPlatformEventAdminRoutes>[1];
  notifications?: Parameters<typeof registerNotificationRoutes>[1];
  issuedDocuments?: Parameters<typeof registerIssuedDocumentRoutes>[1];
  officialDocuments?: Parameters<
    typeof registerOfficialDocumentSettingsRoutes
  >[1];
  catalogProductOptions?: Parameters<
    typeof registerCatalogProductOptionsRoutes
  >[1];
  catalogQuery?: Parameters<typeof registerCatalogAdminQueryRoutes>[1];
  catalogWrite?: Parameters<typeof registerCatalogAdminWriteRoutes>[1];
  posSales?: Parameters<typeof registerPosSaleRoutes>[1];
  stock?: Parameters<typeof registerStockRoutes>[1];
  stockSupply?: Parameters<typeof registerStockSupplyRoutes>[1];
  stockAssignments?: Parameters<typeof registerStockAssignmentRoutes>[1];
  stockBalance?: Parameters<typeof registerStockBalanceRoutes>[1];
  stockBalanceLocation?: Parameters<
    typeof registerStockBalanceLocationRoutes
  >[1];
  stockCount?: Parameters<typeof registerStockCountRoutes>[1];
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
  server.register(helmet, {
    // Allow API responses to be embedded in the web app
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  server.register(rateLimit, {
    global: false, // Apply only to routes that opt-in via config
  });
  registerErrorHandling(server);
  registerRouteAuthorization(server, options.accessControl);
  registerAuthRoutes(server, options.auth);
  registerAdminDirectoryRoutes(server, options.adminDirectory);
  registerAdminAccessRoutes(server, options.adminAccess);
  registerAdminLocationQueryRoutes(server, options.adminLocationQuery);
  registerAdminLocationWriteRoutes(server, options.adminLocationWrite);
  registerAdminUserAccessRoutes(server, options.adminUserAccess);
  registerCatalogBrandRoutes(server, options.catalogBrands);
  registerCatalogMediaRoutes(server, options.catalogMedia);
  registerCatalogAdminQueryRoutes(server, options.catalogQuery);
  registerCatalogAdminWriteRoutes(server, options.catalogWrite);
  registerCatalogProductOptionsRoutes(server, options.catalogProductOptions);
  registerPlatformEventRoutes(server, options.events);
  registerPlatformEventAdminRoutes(server, options.eventsAdmin);
  registerNotificationRoutes(server, options.notifications);
  registerIssuedDocumentRoutes(server, options.issuedDocuments);
  registerOfficialDocumentSettingsRoutes(server, options.officialDocuments);
  registerStockRoutes(server, options.stock);
  registerStockBalanceRoutes(server, options.stockBalance);
  registerStockBalanceLocationRoutes(server, options.stockBalanceLocation);
  registerStockCountRoutes(server, options.stockCount);
  registerCatalogManagerQueryRoutes(server, options.catalogManagerQuery);
  registerManagerStaffRoutes(server, options.stockAssignments);
  registerStockAssignmentRoutes(server, options.stockAssignments);
  registerPosSaleRoutes(server, options.posSales);
  registerStockSupplyRoutes(server, options.stockSupply);
  registerHealthRoutes(server);

  return server;
}
