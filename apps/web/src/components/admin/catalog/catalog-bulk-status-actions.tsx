"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppDataTableBulkActions } from "@/components/data-table/app-data-table.support";
import { Button } from "@/components/ui/button";
import type { CatalogEntityStatus } from "@/lib/admin-models";
import { toast } from "@/lib/toast";
import {
  getBulkStatusActionLabel,
  getBulkStatusActionRows,
  getBulkStatusResultMessage,
} from "./catalog-bulk-status-actions.support";

type BulkStatusRow = {
  slug: string;
  status: CatalogEntityStatus;
};

export function createCatalogBulkActions<T extends BulkStatusRow>(input: {
  canManage: boolean;
  entityLabelPlural: string;
  queryKey: readonly unknown[];
  selectionAriaLabel: string;
  updateStatus: (row: T, targetStatus: CatalogEntityStatus) => Promise<unknown>;
}): AppDataTableBulkActions<T> | undefined {
  if (!input.canManage) {
    return undefined;
  }

  return {
    render: ({ clearSelection, selectedRows }) => (
      <CatalogBulkStatusActions
        clearSelection={clearSelection}
        entityLabelPlural={input.entityLabelPlural}
        queryKey={input.queryKey}
        selectedRows={selectedRows}
        updateStatus={input.updateStatus}
      />
    ),
    selectionAriaLabel: input.selectionAriaLabel,
  };
}

export function CatalogBulkStatusActions<T extends BulkStatusRow>({
  clearSelection,
  entityLabelPlural,
  queryKey,
  selectedRows,
  updateStatus,
}: {
  clearSelection: () => void;
  entityLabelPlural: string;
  queryKey: readonly unknown[];
  selectedRows: T[];
  updateStatus: (row: T, targetStatus: CatalogEntityStatus) => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const archiveRows = getBulkStatusActionRows(selectedRows, "archived");
  const activateRows = getBulkStatusActionRows(selectedRows, "active");

  const mutation = useMutation({
    mutationFn: async (targetStatus: CatalogEntityStatus) => {
      const actionableRows = getBulkStatusActionRows(
        selectedRows,
        targetStatus,
      );
      const results = await Promise.allSettled(
        actionableRows.map((row) => updateStatus(row, targetStatus)),
      );
      const successCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failureCount = results.length - successCount;

      return {
        failureCount,
        successCount,
        targetStatus,
      };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey });

      const message = getBulkStatusResultMessage({
        entityLabelPlural,
        failureCount: result.failureCount,
        successCount: result.successCount,
        targetStatus: result.targetStatus,
      });

      if (message.tone === "success") {
        clearSelection();
        toast.success(message.description);
        return;
      }

      toast.error(message.description);
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={archiveRows.length === 0 || mutation.isPending}
        onClick={() => mutation.mutate("archived")}
        size="sm"
        type="button"
        variant="outline"
      >
        {getBulkStatusActionLabel({
          actionableCount: archiveRows.length,
          isPending: mutation.isPending && mutation.variables === "archived",
          targetStatus: "archived",
        })}
      </Button>
      <Button
        disabled={activateRows.length === 0 || mutation.isPending}
        onClick={() => mutation.mutate("active")}
        size="sm"
        type="button"
        variant="outline"
      >
        {getBulkStatusActionLabel({
          actionableCount: activateRows.length,
          isPending: mutation.isPending && mutation.variables === "active",
          targetStatus: "active",
        })}
      </Button>
      <Button
        disabled={mutation.isPending}
        onClick={clearSelection}
        size="sm"
        type="button"
        variant="ghost"
      >
        Clear
      </Button>
    </div>
  );
}
