import { catalogChangeLog } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { RecordCatalogChangeInput } from "./catalog-change-log.types.js";
import type { CatalogChangeLogWriter } from "./catalog-change-log-writer.js";

export class PostgresCatalogChangeLogWriter implements CatalogChangeLogWriter {
  async record(
    tx: ApiDatabase,
    input: RecordCatalogChangeInput,
  ): Promise<void> {
    await tx.insert(catalogChangeLog).values({
      entityType: input.entityType,
      entityId: input.entityId,
      entityRef: input.entityRef,
      parentEntityType: input.parentEntityType ?? null,
      parentEntityId: input.parentEntityId ?? null,
      operation: input.operation,
      changedFields: input.changedFields,
      before: input.before,
      after: input.after,
      actorId: input.actorId,
      occurredAt: input.occurredAt,
      createdAt: input.occurredAt,
    });
  }
}
