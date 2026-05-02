import type { CatalogChangeLogWriter } from "./catalog-change-log-writer.js";
import { PostgresCatalogChangeLogWriter } from "./postgres-catalog-change-log.repository.js";

export type CatalogChangeLogRuntime = {
  catalogChangeLog: {
    writer: CatalogChangeLogWriter;
  };
};

export function createCatalogChangeLogRuntime(): CatalogChangeLogRuntime {
  return {
    catalogChangeLog: {
      writer: new PostgresCatalogChangeLogWriter(),
    },
  };
}
