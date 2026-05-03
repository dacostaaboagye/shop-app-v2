export type CatalogImportProcessScheduler = (task: () => Promise<void>) => void;

export function scheduleCatalogImportProcess(task: () => Promise<void>): void {
  setImmediate(() => {
    void task().catch(() => undefined);
  });
}
