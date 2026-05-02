import type {
  CatalogChangeEntityType,
  CatalogChangeOperation,
  CatalogChangeSnapshot,
} from "./catalog-change-log.types.js";

/**
 * A single change-log entry surfaced to the admin read API. Internal UUIDs
 * (entityId, parentEntityId, actorId) are NOT exposed; only public-safe
 * references — slugs, SKUs, option-value strings — leave the boundary.
 */
export type ChangeLogEntry = {
  id: string;
  entityType: CatalogChangeEntityType;
  entityRef: string;
  parentEntityType: CatalogChangeEntityType | null;
  parentEntityRef: string | null;
  operation: CatalogChangeOperation;
  changedFields: string[];
  before: CatalogChangeSnapshot;
  after: CatalogChangeSnapshot;
  actorSlug: string;
  actorName: string;
  actorAvatarUrl: string | null;
  occurredAt: string;
};

export type ChangeLogPage = {
  entries: ChangeLogEntry[];
  nextCursor: string | null;
};

export type ChangeLogPageInput = {
  cursor?: string | null;
  limit?: number;
};

export type ReadByEntityInput = ChangeLogPageInput & {
  entityType: CatalogChangeEntityType;
  entityId: string;
};

export type ReadByParentInput = ChangeLogPageInput & {
  parentEntityType: CatalogChangeEntityType;
  parentEntityId: string;
};

export type ChangeLogCursor = {
  occurredAt: Date;
  id: string;
};
