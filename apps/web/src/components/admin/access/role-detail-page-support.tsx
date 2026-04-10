"use client";

import type { AdminRoleDetail } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  getPermissionActionLabel,
  getPermissionSurfaceLabel,
} from "@/lib/access-control";

export const rolePermissionColumns: Array<
  ColumnDef<AdminRoleDetail["permissions"][number], unknown>
> = [
  {
    id: "permission",
    header: "Permission",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-mono text-sm text-foreground">{row.original.key}</p>
        <p className="mt-1 text-sm text-muted-foreground">
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
      <span className="text-sm text-muted-foreground">
        {getPermissionActionLabel(row.original.key)}
      </span>
    ),
  },
  {
    id: "granted",
    header: "Granted",
    cell: ({ row }) => (
      <Badge variant={row.original.granted ? "secondary" : "outline"}>
        {row.original.granted ? "Granted" : "Not granted"}
      </Badge>
    ),
  },
];

export function getRoleErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load role.";
}
