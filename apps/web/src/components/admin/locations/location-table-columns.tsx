"use client";

import type { AdminLocationSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Store, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatAdminDate,
  LOCATION_STATUS_META,
  LOCATION_TYPE_META,
} from "@/lib/admin-models";
import { cn } from "@/lib/utils";

export const locationTableColumns: Array<
  ColumnDef<AdminLocationSummary, unknown>
> = [
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-bold text-foreground truncate max-w-[240px]">
          {row.original.name}
        </p>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
          {row.original.slug}
        </p>
      </div>
    ),
  },
  {
    id: "type",
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const meta = LOCATION_TYPE_META[row.original.type];
      const Icon = row.original.type === "store" ? Store : Warehouse;

      return (
        <Badge
          className={cn(
            "gap-1.5 rounded-md font-bold uppercase tracking-wider text-[10px]",
            meta.className,
          )}
          variant="outline"
        >
          <Icon className="size-3" />
          {meta.label}
        </Badge>
      );
    },
  },
  {
    id: "managerName",
    accessorKey: "managerName",
    enableSorting: false,
    header: "Manager",
    cell: ({ row }) =>
      row.original.managerName ? (
        <span className="text-sm font-bold text-foreground">
          {row.original.managerName}
        </span>
      ) : (
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
          Unassigned
        </span>
      ),
  },
  {
    id: "operations",
    enableSorting: false,
    header: "Operations",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          {row.original.staffCount} staff assigned
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          {row.original.zoneCount} zones configured
        </span>
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const meta = LOCATION_STATUS_META[row.original.status];

      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "rounded-md font-bold uppercase tracking-wider text-[10px]",
              meta.className,
            )}
            variant="outline"
          >
            {meta.label}
          </Badge>
          {row.original.isFulfilmentEnabled ? (
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px] bg-primary/5 text-primary border-primary/20"
              variant="outline"
            >
              <Building2 className="size-3 mr-1.5" />
              Fulfilment
            </Badge>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="tabular-nums text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];
