import type {
  CatalogChangeEntityType,
  CatalogChangeOperation,
} from "@shop/contracts";

type OperationMeta = {
  className: string;
  label: string;
};

// Human-readable label for the entity that the change happened to. Used as
// the subject of each entry header so "Created" reads as "Created Variant
// BAG-CTC-002" instead of an unanchored verb.
export const CHANGE_ENTITY_LABEL: Record<CatalogChangeEntityType, string> = {
  catalog_brand: "Brand",
  catalog_category: "Category",
  catalog_product: "Product",
  catalog_product_option: "Option",
  catalog_product_option_value: "Option value",
  product_variant: "Variant",
};

// Token-driven, semantic only — no raw palette. Each maps to an operation
// the audit log emits. Variant on the Badge primitive carries the
// background/foreground; we only add intent shading where the variant
// alone wouldn't read.
export const CHANGE_OPERATION_META: Record<
  CatalogChangeOperation,
  OperationMeta
> = {
  archived: {
    className: "bg-muted/50 text-muted-foreground border-0",
    label: "Archived",
  },
  created: {
    className: "bg-success/15 text-success border-0",
    label: "Created",
  },
  deleted: {
    className: "bg-destructive/10 text-destructive border-0",
    label: "Deleted",
  },
  restored: {
    className: "bg-primary/10 text-primary border-0",
    label: "Restored",
  },
  updated: {
    className: "bg-accent text-accent-foreground border-0",
    label: "Updated",
  },
};

export function formatFieldLabel(field: string): string {
  return field
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (character) => character.toUpperCase());
}
