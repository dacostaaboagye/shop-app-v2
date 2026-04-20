import type { PlatformEventDeliveryService } from "./platform-event-delivery.service.js";

type PlatformEventDeliveryLoopOptions = {
  batchSize?: number;
  pollIntervalMs?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 2_000;

export class PlatformEventDeliveryLoop {
  private activeRun: Promise<void> | null = null;
  private stopped = true;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly service: PlatformEventDeliveryService,
    private readonly options: PlatformEventDeliveryLoopOptions = {},
  ) {}

  start() {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    this.scheduleNow();
  }

  stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  trigger() {
    if (this.stopped) {
      return;
    }

    this.scheduleNow();
  }

  private scheduleNow() {
    if (this.activeRun) {
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.activeRun = this.runOnce().finally(() => {
      this.activeRun = null;
      if (!this.stopped) {
        this.timer = setTimeout(
          () => this.scheduleNow(),
          this.options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
        );
      }
    });
  }

  private async runOnce() {
    while (!this.stopped) {
      const result = await this.service.dispatchAvailable(
        this.options.batchSize ? { batchSize: this.options.batchSize } : {},
      );

      if (result.claimedCount === 0) {
        return;
      }
    }
  }
}
