import type { ApiEnv } from "../../env.js";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { PlatformEventNotificationProjector } from "../notifications/platform-event-notification-projector.js";
import { PostgresNotificationRecipientRepository } from "../notifications/postgres-notification-recipient.repository.js";
import { PostgresUserNotificationRepository } from "../notifications/postgres-user-notification.repository.js";
import { PlatformEventDeliveryHealthService } from "./platform-event-delivery-health.service.js";
import { PlatformEventDeliveryLoop } from "./platform-event-delivery-loop.js";
import { PlatformEventDeliveryService } from "./platform-event-delivery.service.js";
import { PlatformEventPipelinePublisher } from "./platform-event-pipeline.publisher.js";
import type { PlatformEventPublisher } from "./platform-event.types.js";
import { PostgresPlatformEventDeliveryHealthRepository } from "./postgres-platform-event-delivery-health.repository.js";
import { PostgresPlatformEventRepository } from "./postgres-platform-event.repository.js";

type PlatformEventRuntimeEnv = Pick<
  ApiEnv,
  | "platformEventDeliveryBatchSize"
  | "platformEventDeliveryPollIntervalMs"
  | "platformEventDeliveryProcessingLeaseMs"
>;

type PlatformEventRuntimeDependencies = {
  databaseRuntime: DatabaseRuntime;
  env: PlatformEventRuntimeEnv;
  livePublisher?: PlatformEventPublisher;
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">;
};

export function createPlatformEventRuntime(
  dependencies: PlatformEventRuntimeDependencies,
) {
  const platformEventRepository = new PostgresPlatformEventRepository(
    dependencies.databaseRuntime.db,
  );
  const notificationProjector = new PlatformEventNotificationProjector({
    notificationRecipientRepository: new PostgresNotificationRecipientRepository(
      dependencies.databaseRuntime.db,
    ),
    permissionService: dependencies.permissionService,
    userNotificationRepository: new PostgresUserNotificationRepository(
      dependencies.databaseRuntime.db,
    ),
  });
  const platformEventDeliveryService = new PlatformEventDeliveryService({
    eventLogRepository: platformEventRepository,
    ...(dependencies.livePublisher
      ? { livePublisher: dependencies.livePublisher }
      : {}),
    notificationProjector,
    processingLeaseMs: dependencies.env.platformEventDeliveryProcessingLeaseMs,
  });
  const platformEventDeliveryLoop = new PlatformEventDeliveryLoop(
    platformEventDeliveryService,
    {
      batchSize: dependencies.env.platformEventDeliveryBatchSize,
      pollIntervalMs: dependencies.env.platformEventDeliveryPollIntervalMs,
    },
  );

  return {
    platformEventDeliveryHealthService: new PlatformEventDeliveryHealthService({
      processingLeaseMs: dependencies.env.platformEventDeliveryProcessingLeaseMs,
      repository: new PostgresPlatformEventDeliveryHealthRepository(
        dependencies.databaseRuntime.db,
      ),
    }),
    platformEventDeliveryLoop,
    platformEventPublisher: new PlatformEventPipelinePublisher({
      afterAppend() {
        platformEventDeliveryLoop.trigger();
      },
      eventLogRepository: platformEventRepository,
    }),
  };
}
