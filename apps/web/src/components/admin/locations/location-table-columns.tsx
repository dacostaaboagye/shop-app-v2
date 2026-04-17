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
      <div>
        <p className="font-medium leading-none">{row.original.name}</p>
        <p className="mt-0.5 font-mono text-[0.68rem] text-muted-foreground">
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
          className={cn("gap-1.5 text-[0.68rem]", meta.className)}
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
        <span className="text-sm">{row.original.managerName}</span>
      ) : (
        <span className="text-sm text-muted-foreground">Unassigned</span>
      ),
  },
  {
    id: "operations",
    enableSorting: false,
    header: "Operations",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span>{row.original.staffCount} staff assigned</span>
        <span>{row.original.zoneCount} zones configured</span>
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
          <Badge className={meta.className} variant="outline">
            {meta.label}
          </Badge>
          {row.original.isFulfilmentEnabled ? (
            <Badge variant="secondary">
              <Building2 className="size-3" />
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
      <span className="tabular-nums text-sm text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];
