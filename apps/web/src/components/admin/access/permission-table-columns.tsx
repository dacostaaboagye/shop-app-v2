"use client";

import type { AdminPermissionSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  getPermissionActionLabel,
  getPermissionSurfaceLabel,
} from "@/lib/access-control";

export const permissionTableColumns: Array<
  ColumnDef<AdminPermissionSummary, unknown>
> = [
  {
    accessorKey: "key",
    id: "key",
    header: "Permission",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-mono text-sm text-foreground">{row.original.key}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {row.original.description}
        </p>
      </div>
    ),
  },
  {
    id: "surface",
    header: "Surface",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {getPermissionSurfaceLabel(row.original.key)}
      </span>
    ),
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => (
      <Badge
        className="border-border bg-muted/30 text-foreground"
        variant="outline"
      >
        {getPermissionActionLabel(row.original.key)}
      </Badge>
    ),
  },
  {
    accessorKey: "assignedRoleCount",
    id: "assignedRoleCount",
    header: "Assigned roles",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.original.assignedRoleCount}
      </span>
    ),
  },
];
