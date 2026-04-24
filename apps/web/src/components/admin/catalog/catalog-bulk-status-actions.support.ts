import type { CatalogEntityStatus } from "@/lib/admin-models";

type BulkStatusRow = {
  status: CatalogEntityStatus;
};

export function getBulkStatusActionRows<T extends BulkStatusRow>(
  rows: T[],
  targetStatus: CatalogEntityStatus,
): T[] {
  return rows.filter((row) => row.status !== targetStatus);
}

export function getBulkStatusActionLabel(input: {
  actionableCount: number;
  isPending: boolean;
  targetStatus: CatalogEntityStatus;
}) {
  if (input.isPending) {
    return input.targetStatus === "archived" ? "Archiving..." : "Activating...";
  }

  return input.targetStatus === "archived"
    ? "Archive selected"
    : "Activate selected";
}

export function getBulkStatusResultMessage(input: {
  entityLabelPlural: string;
  failureCount: number;
  successCount: number;
  targetStatus: CatalogEntityStatus;
}) {
  const action = input.targetStatus === "archived" ? "Archived" : "Activated";
  const entityLabel = input.entityLabelPlural.toLowerCase();

  if (input.failureCount === 0) {
    return {
      description: `${action} ${input.successCount} ${entityLabel}.`,
      tone: "success" as const,
    };
  }

  return {
    description:
      `${action} ${input.successCount} ${entityLabel}. ` +
      `${input.failureCount} failed and may need manual review.`,
    tone: "error" as const,
  };
}
