import type { CatalogChangeOperation } from "@shop/contracts";

type OperationMeta = {
  className: string;
  label: string;
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
