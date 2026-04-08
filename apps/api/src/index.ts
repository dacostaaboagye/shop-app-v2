import { getApiEnv } from "./env.js";
import { createDatabaseRuntime } from "./infrastructure/database.js";
import { createAuthRuntime } from "./modules/auth/create-auth-runtime.js";
import { createServer } from "./server/create-server.js";

const env = getApiEnv();

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL must be configured.");
}

const databaseRuntime = createDatabaseRuntime(env.databaseUrl);
const authRuntime = createAuthRuntime(databaseRuntime, env);
const server = createServer({
  accessControl: authRuntime.accessControl,
  auth: authRuntime.auth,
});

try {
  await server.listen({ host: env.apiHost, port: env.apiPort });
  server.log.info(`API listening on http://${env.apiHost}:${env.apiPort}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
