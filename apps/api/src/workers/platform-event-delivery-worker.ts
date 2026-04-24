import { getApiEnv } from "../env.js";
import { createDatabaseRuntime } from "../infrastructure/database.js";
import { createAuthRuntime } from "../modules/auth/create-auth-runtime.js";
import { createPlatformEventRuntime } from "../modules/events/create-platform-event-runtime.js";
import { createPlatformEventDeliveryWorkerRuntime } from "../modules/events/platform-event-delivery-worker-runtime.js";

const env = getApiEnv();

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL must be configured.");
}

const databaseRuntime = createDatabaseRuntime(env.databaseUrl);
const authRuntime = createAuthRuntime(databaseRuntime, env);
const platformEventRuntime = createPlatformEventRuntime({
  databaseRuntime,
  env,
  permissionService: authRuntime.accessControl.permissionService,
});
const workerRuntime = createPlatformEventDeliveryWorkerRuntime({
  databasePool: databaseRuntime.pool,
  deliveryEnabled: env.platformEventDeliveryEnabled,
  deliveryLoop: platformEventRuntime.platformEventDeliveryLoop,
  logger: {
    info(details, message) {
      console.info(message, details);
    },
    warn(details, message) {
      console.warn(message, details);
    },
  },
});

let stopping = false;

async function stop(signal: string) {
  if (stopping) {
    return;
  }

  stopping = true;
  console.info(`Received ${signal}; stopping platform event delivery worker.`);
  await workerRuntime.stop();
}

process.once("SIGINT", () => {
  void stop("SIGINT").then(() => process.exit(0));
});
process.once("SIGTERM", () => {
  void stop("SIGTERM").then(() => process.exit(0));
});

try {
  const started = await workerRuntime.start();
  if (!started) {
    await workerRuntime.stop();
  }
} catch (error) {
  console.error("Platform event delivery worker failed.", error);
  await workerRuntime.stop();
  process.exit(1);
}
