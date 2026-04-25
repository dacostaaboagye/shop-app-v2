"use client";

import type { AdminLocationZoneSummary } from "@shop/contracts";
import { Archive, Plus } from "lucide-react";
import type { MouseEvent } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAdminDate } from "@/lib/admin-models";

export function LocationZonesTable({
  onDelete,
  onEdit,
  zones,
}: {
  onDelete: (
    zone: AdminLocationZoneSummary,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  onEdit: (zone: AdminLocationZoneSummary) => void;
  zones: AdminLocationZoneSummary[];
}) {
  if (zones.length === 0) {
    return (
      <AppEmptyState
        description="Add a zone to start tracking stock across specific handling areas."
        icon={Plus}
        kind="no-data"
        title="No zones configured"
      />
    );
  }

  return (
    <AppDataTable
      columns={[
        {
          id: "name",
          header: () => "Name",
          cell: (ctx) => (
            <div className="font-medium text-foreground">
              {ctx.row.original.name}
            </div>
          ),
        },
        {
          id: "description",
          header: () => "Description",
          cell: (ctx) => (
            <div className="type-support max-w-[300px] text-pretty text-muted-foreground">
              {ctx.row.original.description || "Not set"}
            </div>
          ),
        },
        {
          id: "createdAt",
          header: () => "Created",
          cell: (ctx) => (
            <div className="type-support tabular-nums text-muted-foreground">
              {formatAdminDate(ctx.row.original.createdAt)}
            </div>
          ),
        },
        {
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: (ctx) => (
            <div className="relative flex justify-end">
              <Button
                className="text-muted-foreground hover:text-destructive"
                onClick={(event: MouseEvent<HTMLButtonElement>) =>
                  onDelete(ctx.row.original, event)
                }
                size="icon"
                title="Delete zone"
                variant="ghost"
              >
                <Archive className="size-4" />
              </Button>
            </div>
          ),
        },
      ]}
      data={zones}
      density="compact"
      emptyDescription="Add a zone to start tracking stock across specific handling areas."
      emptyTitle="No zones configured"
      getRowId={(row) => row.slug}
      onRowClick={(row) => onEdit(row)}
    />
  );
}

export function DeleteZoneDialog({
  deletingZone,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  deletingZone: AdminLocationZoneSummary | null;
  isPending: boolean;
  onConfirm: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={!!deletingZone}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete zone?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the zone{" "}
            <strong>{deletingZone?.name}</strong>? This action cannot be undone.
            Zones containing active stock assignments cannot be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={onConfirm}
            variant="destructive"
          >
            {isPending ? "Deleting..." : "Delete zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
