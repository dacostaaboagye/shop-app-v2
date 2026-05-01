import { getApiEnv } from "./env.js";
import { createDatabaseRuntime } from "./infrastructure/database.js";
import { createR2StorageService } from "./infrastructure/r2-storage.js";
import { createAdminDirectoryRuntime } from "./modules/admin/create-admin-directory-runtime.js";
import { createAssignmentsRuntime } from "./modules/assignments/create-assignments-runtime.js";
import { AccountProfileMediaService } from "./modules/auth/account-profile-media.service.js";
import { createAuthRuntime } from "./modules/auth/create-auth-runtime.js";
import { createCatalogRuntime } from "./modules/catalog/create-catalog-runtime.js";
import { PostgresVariantSearchRepository } from "./modules/catalog/postgres-variant-search.repository.js";
import { createPlatformEventRuntime } from "./modules/events/create-platform-event-runtime.js";
import { InMemoryPlatformEventBus } from "./modules/events/in-memory-platform-event-bus.js";
import {
  createConfiguredEmailService,
  createMessagingRuntime,
} from "./modules/messaging/create-email-runtime.js";
import { assertEmailFromAddressAllowed } from "./modules/messaging/email-from-address-policy.js";
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

if (env.nodeEnv !== "development" && !env.webBaseUrl) {
  throw new Error(
    "WEB_BASE_URL must be configured outside of development to enforce CORS.",
  );
}

assertEmailFromAddressAllowed({
  fromAddress: env.emailFromAddress,
  allowedDomains: env.emailAllowedFromDomains,
});

const databaseRuntime = createDatabaseRuntime(env.databaseUrl);
const storage = createR2StorageService(env);
const eventBus = new InMemoryPlatformEventBus();
const sharedEmailService = createConfiguredEmailService(databaseRuntime, env);
const authRuntime = createAuthRuntime(databaseRuntime, env, {
  emailService: sharedEmailService,
});
const platformEventRuntime = createPlatformEventRuntime({
  databaseRuntime,
  env,
  livePublisher: eventBus,
  permissionService: authRuntime.accessControl.permissionService,
});
// Auth runtime is constructed before platformEventRuntime (the latter
// depends on permissionService), so we wire the publisher into auth
// services that need it once both exist.
authRuntime.auth.passwordResetService.setPlatformEventPublisher(
  platformEventRuntime.platformEventPublisher,
);
const messagingRuntime = createMessagingRuntime(databaseRuntime, env, {
  emailService: sharedEmailService,
  platformEventPublisher: platformEventRuntime.platformEventPublisher,
});
const adminDirectoryRuntime = createAdminDirectoryRuntime(databaseRuntime, {
  emailService: sharedEmailService,
  env,
  platformEventPublisher: platformEventRuntime.platformEventPublisher,
  ...(env.webBaseUrl ? { webBaseUrl: env.webBaseUrl } : {}),
});
const catalogRuntime = createCatalogRuntime(databaseRuntime, storage, {
  platformEventPublisher: platformEventRuntime.platformEventPublisher,
});
const officialDocumentRuntime = createOfficialDocumentSettingsRuntime(
  databaseRuntime,
  {
    emailFromAddress: env.emailFromAddress,
    platformEventPublisher: platformEventRuntime.platformEventPublisher,
  },
);
const salesRuntime = createSalesRuntime(databaseRuntime, {
  documentProfileResolver:
    officialDocumentRuntime.officialDocuments.settingsService,
  platformEventPublisher: platformEventRuntime.platformEventPublisher,
});
const assignmentsRuntime = createAssignmentsRuntime(databaseRuntime, {
  platformEventPublisher: platformEventRuntime.platformEventPublisher,
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
const salesDocumentSnapshotService = new SalesIssuedDocumentSnapshotService({
  emailService: sharedEmailService,
  invoiceRepository: salesRuntime.sales.invoiceQueryRepository,
  permissionService: authRuntime.accessControl.permissionService,
  settingsService: officialDocumentRuntime.officialDocuments.settingsService,
  snapshotService:
    officialDocumentRuntime.officialDocuments.issuedDocumentSnapshotService,
});
const accountProfileMediaService = new AccountProfileMediaService(
  authRuntime.auth.currentUserService,
  catalogRuntime.catalog.catalogMediaService,
);
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
  adminSuppliers: adminDirectoryRuntime.adminDirectory,
  adminUserAccess: adminDirectoryRuntime.adminDirectory,
  auth: authRuntime.auth,
  authProfileMedia: {
    accountProfileMediaService,
  },
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
  messagingAdmin: {
    adminCommunicationQueryService:
      messagingRuntime.adminCommunicationQueryService,
    adminCommunicationService: messagingRuntime.adminCommunicationService,
    operationsService: messagingRuntime.emailOperationsService,
  },
  messagingWebhooks: {
    resendWebhookService: messagingRuntime.resendWebhookService,
  },
  managerDashboard: {
    invoiceRepository: salesRuntime.sales.invoiceQueryRepository,
    permissionService: authRuntime.accessControl.permissionService,
    stockBalanceQueryRepo: stockRuntime.stock.stockBalanceQueryRepo,
    supplyRequestRepository: stockRuntime.stock.supplyRequestRepository,
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
  stock: {
    permissionService: authRuntime.accessControl.permissionService,
    reservationQueryRepo: stockRuntime.stock.reservationQueryRepo,
  },
  stockAssignments: {
    ...assignmentsRuntime.assignments,
    permissionService: authRuntime.accessControl.permissionService,
  },
  workerDashboard: {
    assignmentQueryRepository:
      assignmentsRuntime.assignments.assignmentQueryRepository,
    invoiceRepository: salesRuntime.sales.invoiceQueryRepository,
    notificationQueryService,
    permissionService: authRuntime.accessControl.permissionService,
  },
  stockBalance: stockRuntime.stock,
  stockBalanceLocation: {
    permissionService: authRuntime.accessControl.permissionService,
    stockBalanceQueryRepo: stockRuntime.stock.stockBalanceQueryRepo,
  },
  stockCount: {
    permissionService: authRuntime.accessControl.permissionService,
    stockCountRepo: stockRuntime.stock.stockCountRepo,
  },
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
