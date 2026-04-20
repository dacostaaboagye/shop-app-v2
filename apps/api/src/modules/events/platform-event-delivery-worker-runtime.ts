type PlatformEventDeliveryWorkerLogger = {
  info(details: object, message: string): void;
  warn(details: object, message: string): void;
};

type PlatformEventDeliveryWorkerRuntimeDependencies = {
  databasePool: {
    end(): Promise<void>;
  };
  deliveryEnabled: boolean;
  deliveryLoop: {
    start(): void;
    stop(): void;
  };
  logger?: PlatformEventDeliveryWorkerLogger;
};

export function createPlatformEventDeliveryWorkerRuntime(
  dependencies: PlatformEventDeliveryWorkerRuntimeDependencies,
) {
  return {
    async start() {
      if (!dependencies.deliveryEnabled) {
        dependencies.logger?.warn(
          {},
          "Platform event delivery worker is disabled by environment.",
        );
        return false;
      }

      dependencies.deliveryLoop.start();
      dependencies.logger?.info(
        {},
        "Platform event delivery worker started.",
      );
      return true;
    },
    async stop() {
      dependencies.deliveryLoop.stop();
      await dependencies.databasePool.end();
      dependencies.logger?.info(
        {},
        "Platform event delivery worker stopped.",
      );
    },
  };
}
