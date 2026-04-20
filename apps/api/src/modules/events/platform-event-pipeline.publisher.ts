import type { PlatformEventPublisher, PlatformEventRecord } from "./platform-event.types.js";
import type { PlatformEventAppendDatabase } from "./postgres-platform-event.repository.js";

type PlatformEventPipelineDependencies = {
  afterAppend?: () => void | Promise<void>;
  eventLogRepository: {
    append(event: PlatformEventRecord): Promise<void>;
    appendWithinTransaction?(
      event: PlatformEventRecord,
      db: PlatformEventAppendDatabase,
    ): Promise<void>;
  };
};

export class PlatformEventPipelinePublisher implements PlatformEventPublisher {
  constructor(private readonly dependencies: PlatformEventPipelineDependencies) {}

  async publish(event: PlatformEventRecord): Promise<void> {
    await this.dependencies.eventLogRepository.append(event);
    await this.notifyAppendCommitted();
  }

  async appendWithinTransaction(
    event: PlatformEventRecord,
    db: PlatformEventAppendDatabase,
  ): Promise<void> {
    if (!this.dependencies.eventLogRepository.appendWithinTransaction) {
      throw new Error("Platform event repository does not support transactional append.");
    }

    await this.dependencies.eventLogRepository.appendWithinTransaction(event, db);
  }

  async notifyAppendCommitted(): Promise<void> {
    await Promise.resolve(this.dependencies.afterAppend?.());
  }
}
