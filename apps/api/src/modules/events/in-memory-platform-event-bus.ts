import type {
  PlatformEventBus,
  PlatformEventRecord,
} from "./platform-event.types.js";

export class InMemoryPlatformEventBus implements PlatformEventBus {
  private readonly listeners = new Set<
    (event: PlatformEventRecord) => void | Promise<void>
  >();

  async publish(event: PlatformEventRecord): Promise<void> {
    await Promise.all(
      Array.from(this.listeners, (listener) => Promise.resolve(listener(event))),
    );
  }

  subscribe(
    listener: (event: PlatformEventRecord) => void | Promise<void>,
  ): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
