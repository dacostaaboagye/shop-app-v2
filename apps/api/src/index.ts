import { getApiEnv } from "./env.js";
import { createDatabaseRuntime } from "./infrastructure/database.js";
import { createR2StorageService } from "./infrastructure/r2-storage.js";
import { createAdminDirectoryRuntime } from "./modules/admin/create-admin-directory-runtime.js";
import { createAssignmentsRuntime } from "./modules/assignments/create-assignments-runtime.js";
import { createAuthRuntime } from "./modules/auth/create-auth-runtime.js";
import { createCatalogRuntime } from "./modules/catalog/create-catalog-runtime.js";
import { PostgresVariantSearchRepository } from "./modules/catalog/postgres-variant-search.repository.js";
import { createPlatformEventRuntime } from "./modules/events/create-platform-event-runtime.js";
import { InMemoryPlatformEventBus } from "./modules/events/in-memory-platform-event-bus.js";
import { NotificationQueryService } from "./modules/notifications/notification-query.service.js";
import { NotificationWriteService } from "./modules/notifications/notification-write.service.js";
import { PostgresNotificationQueryRepository } from "./modules/notifications/postgres-notification-query.repository.js";
import { PostgresNotificationWriteRepository } from "./modules/notifications/postgres-notification-write.repository.js";
import { createOfficialDocumentSettingsRuntime } from "./modules/official-documents/create-official-document-settings-runtime.js";
import { GtnIssuedDocumentSnapshotService } from "./modules/official-documents/gtn-issued-document-snapshot.service.js";
import { SalesIssuedDocumentSnapshotService } from "./modules/official-documents/sales-issued-document-snapshot.service.js";
import { createSalesRuntime } from "./modules/sales/create-sales-runtime.js";
import { createStockRuntime } from "./modules/stock/create-stock-runtime.js";
import { createServer } from "./server/create-server.js";

const env = getApiEnv();

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL must be configured.");
}

const databaseRuntime = createDatabaseRuntime(env.databaseUrl);
const storage = createR2StorageService(env);
const eventBus = new InMemoryPlatformEventBus();
const adminDirectoryRuntime = createAdminDirectoryRuntime(databaseRuntime);
const authRuntime = createAuthRuntime(databaseRuntime, env);
const catalogRuntime = createCatalogRuntime(databaseRuntime, storage);
const salesRuntime = createSalesRuntime(databaseRuntime);
const assignmentsRuntime = createAssignmentsRuntime(databaseRuntime);
const platformEventRuntime = createPlatformEventRuntime({
  databaseRuntime,
  env,
  livePublisher: eventBus,
  permissionService: authRuntime.accessControl.permissionService,
});
const stockRuntime = createStockRuntime(databaseRuntime, {
  platformEventPublisher: platformEventRuntime.platformEventPublisher,
});
const notificationQueryService = new NotificationQueryService(
  new PostgresNotificationQueryRepository(databaseRuntime.db),
);
const notificationWriteService = new NotificationWriteService(
  new PostgresNotificationWriteRepository(databaseRuntime.db),
);
const officialDocumentRuntime =
  createOfficialDocumentSettingsRuntime(databaseRuntime);
const salesDocumentSnapshotService = new SalesIssuedDocumentSnapshotService({
  invoiceRepository: salesRuntime.sales.invoiceQueryRepository,
  permissionService: authRuntime.accessControl.permissionService,
  settingsService: officialDocumentRuntime.officialDocuments.settingsService,
  snapshotService:
    officialDocumentRuntime.officialDocuments.issuedDocumentSnapshotService,
});
const gtnDocumentSnapshotService = new GtnIssuedDocumentSnapshotService({
  permissionService: authRuntime.accessControl.permissionService,
  settingsService: officialDocumentRuntime.officialDocuments.settingsService,
  snapshotService:
    officialDocumentRuntime.officialDocuments.issuedDocumentSnapshotService,
  supplyRequestRepository: stockRuntime.stock.supplyRequestRepository,
});
const server = createServer({
  accessControl: authRuntime.accessControl,
  adminAccess: adminDirectoryRuntime.adminDirectory,
  adminDirectory: adminDirectoryRuntime.adminDirectory,
  adminLocationQuery: adminDirectoryRuntime.adminDirectory,
  adminLocationWrite: adminDirectoryRuntime.adminDirectory,
  adminUserAccess: adminDirectoryRuntime.adminDirectory,
  auth: authRuntime.auth,
  catalogManagerQuery: {
    variantSearchRepository: new PostgresVariantSearchRepository(
      databaseRuntime.db,
    ),
  },
  catalogBrands: catalogRuntime.catalog,
  catalogMedia: catalogRuntime.catalog,
  events: {
    eventSubscriber: eventBus,
    permissionService: authRuntime.accessControl.permissionService,
  },
  eventsAdmin: {
    deliveryHealthService:
      platformEventRuntime.platformEventDeliveryHealthService,
  },
  notifications: {
    notificationQueryService,
    notificationWriteService,
  },
  issuedDocuments: {
    gtnDocumentSnapshotService,
    salesDocumentSnapshotService,
  },
  officialDocuments: {
    permissionService: authRuntime.accessControl.permissionService,
    settingsService: officialDocumentRuntime.officialDocuments.settingsService,
  },
  catalogProductOptions: {
    optionsRepo: catalogRuntime.catalog.productOptionsRepo,
  },
  catalogQuery: catalogRuntime.catalog,
  catalogWrite: catalogRuntime.catalog,
  posSales: {
    invoiceRepository: salesRuntime.sales.invoiceQueryRepository,
    permissionService: authRuntime.accessControl.permissionService,
    posSaleService: salesRuntime.sales.posSaleService,
  },
  stock: stockRuntime.stock,
  stockAssignments: assignmentsRuntime.assignments,
  stockBalance: stockRuntime.stock,
  stockBalanceLocation: {
    permissionService: authRuntime.accessControl.permissionService,
    stockBalanceQueryRepo: stockRuntime.stock.stockBalanceQueryRepo,
  },
  stockCount: stockRuntime.stock,
  stockSupply: {
    locationRepository: stockRuntime.stock.locationRepository,
    permissionService: authRuntime.accessControl.permissionService,
    referenceNumberService: stockRuntime.stock.referenceNumberService,
    supplyRequestRepository: stockRuntime.stock.supplyRequestRepository,
    supplyService: stockRuntime.stock.supplyService,
    variantSnapshotRepository: stockRuntime.stock.variantSnapshotRepository,
  },
});
server.addHook("onClose", async () => {
  platformEventRuntime.platformEventDeliveryLoop.stop();
});

try {
  if (env.platformEventDeliveryEnabled) {
    platformEventRuntime.platformEventDeliveryLoop.start();
  }
  await server.listen({ host: env.apiHost, port: env.apiPort });
  server.log.info(`API listening on http://${env.apiHost}:${env.apiPort}`);
} catch (error) {
  platformEventRuntime.platformEventDeliveryLoop.stop();
  server.log.error(error);
  process.exit(1);
}
