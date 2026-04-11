import { getApiEnv } from "./env.js";
import { createDatabaseRuntime } from "./infrastructure/database.js";
import { createR2StorageService } from "./infrastructure/r2-storage.js";
import { createAdminDirectoryRuntime } from "./modules/admin/create-admin-directory-runtime.js";
import { createAuthRuntime } from "./modules/auth/create-auth-runtime.js";
import { createCatalogRuntime } from "./modules/catalog/create-catalog-runtime.js";
import { createServer } from "./server/create-server.js";

const env = getApiEnv();

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL must be configured.");
}

const databaseRuntime = createDatabaseRuntime(env.databaseUrl);
const storage = createR2StorageService(env);
const adminDirectoryRuntime = createAdminDirectoryRuntime(databaseRuntime);
const authRuntime = createAuthRuntime(databaseRuntime, env);
const catalogRuntime = createCatalogRuntime(databaseRuntime, storage);
const server = createServer({
  accessControl: authRuntime.accessControl,
  adminAccess: adminDirectoryRuntime.adminDirectory,
  adminDirectory: adminDirectoryRuntime.adminDirectory,
  adminLocationQuery: adminDirectoryRuntime.adminDirectory,
  adminLocationWrite: adminDirectoryRuntime.adminDirectory,
  adminUserAccess: adminDirectoryRuntime.adminDirectory,
  auth: authRuntime.auth,
  catalogBrands: catalogRuntime.catalog,
  catalogMedia: catalogRuntime.catalog,
  catalogProductOptions: {
    optionsRepo: catalogRuntime.catalog.productOptionsRepo,
  },
  catalogQuery: catalogRuntime.catalog,
  catalogWrite: catalogRuntime.catalog,
});

try {
  await server.listen({ host: env.apiHost, port: env.apiPort });
  server.log.info(`API listening on http://${env.apiHost}:${env.apiPort}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
