import type { ApiDatabase } from "../../infrastructure/database.js";
import { CatalogChangeLogReadService } from "./catalog-change-log-read.service.js";
import type { CatalogChangeLogWriter } from "./catalog-change-log-writer.js";
import { PostgresCatalogChangeLogWriter } from "./postgres-catalog-change-log.repository.js";
import { PostgresCatalogChangeLogReadRepository } from "./postgres-catalog-change-log-read.repository.js";

export type CatalogChangeLogRuntime = {
  catalogChangeLog: {
    writer: CatalogChangeLogWriter;
    readService: CatalogChangeLogReadService;
  };
};

export function createCatalogChangeLogRuntime(
  db: ApiDatabase,
): CatalogChangeLogRuntime {
  return {
    catalogChangeLog: {
      writer: new PostgresCatalogChangeLogWriter(),
      readService: new CatalogChangeLogReadService(
        new PostgresCatalogChangeLogReadRepository(db),
      ),
    },
  };
}
