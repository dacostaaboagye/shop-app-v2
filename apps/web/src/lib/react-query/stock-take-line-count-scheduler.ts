import type { StockTakeLineCountEntry } from "@/lib/react-query/stock-take-counts";

export type SchedulerFlush = (entries: StockTakeLineCountEntry[]) => Promise<{
  ok: boolean;
}>;

export type SchedulerOptions = {
  debounceMs?: number;
  onFlushBegin?: (lineNumbers: number[]) => void;
  onFlushDone?: (lineNumbers: number[]) => void;
  onFlushError?: (lineNumbers: number[], error: unknown) => void;
};

const DEFAULT_DEBOUNCE_MS = 500;

export class StockTakeLineCountScheduler {
  private readonly pending = new Map<number, StockTakeLineCountEntry>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(
    private readonly flush: SchedulerFlush,
    private readonly options: SchedulerOptions = {},
  ) {
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  }

  queue(entry: StockTakeLineCountEntry): void {
    this.pending.set(entry.lineNumber, entry);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flushNow();
    }, this.debounceMs);
  }

  async flushNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending.size === 0) return;

    const entries = [...this.pending.values()];
    this.pending.clear();
    const lineNumbers = entries.map((entry) => entry.lineNumber);
    this.options.onFlushBegin?.(lineNumbers);

    try {
      const result = await this.flush(entries);
      if (result.ok) {
        this.options.onFlushDone?.(lineNumbers);
      } else {
        this.options.onFlushError?.(lineNumbers, new Error("flush failed"));
      }
    } catch (error) {
      this.options.onFlushError?.(lineNumbers, error);
    }
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
  }
}
