import type { ApiDatabase } from "../../infrastructure/database.js";
import type { RecordCatalogChangeInput } from "./catalog-change-log.types.js";

/**
 * Append-only writer for the catalog change log. Implementations MUST
 * insert in the supplied transaction so the log row commits atomically
 * with the entity write that produced it.
 */
export interface CatalogChangeLogWriter {
  record(tx: ApiDatabase, input: RecordCatalogChangeInput): Promise<void>;
}
