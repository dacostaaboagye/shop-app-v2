export type CatalogChangeEntityType =
  | "catalog_brand"
  | "catalog_category"
  | "catalog_product"
  | "product_variant"
  | "catalog_product_option"
  | "catalog_product_option_value";

export type CatalogChangeOperation =
  | "created"
  | "updated"
  | "archived"
  | "restored"
  | "deleted";

export type CatalogChangeSnapshot = Record<string, unknown> | null;

export type RecordCatalogChangeInput = {
  entityType: CatalogChangeEntityType;
  entityId: string;
  entityRef: string;
  parentEntityType?: CatalogChangeEntityType | null;
  parentEntityId?: string | null;
  operation: CatalogChangeOperation;
  changedFields: string[];
  before: CatalogChangeSnapshot;
  after: CatalogChangeSnapshot;
  actorId: string;
  occurredAt: Date;
};
