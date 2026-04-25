"use client";

import type { AdminRoleDetail } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AccessActionBadge,
  AccessNameCell,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
import { Badge } from "@/components/ui/badge";
import {
  getPermissionActionLabel,
  getPermissionSurfaceLabel,
} from "@/lib/access-control";
import { getAppErrorMessage } from "@/lib/errors/app-error";

export const rolePermissionColumns: Array<
  ColumnDef<AdminRoleDetail["permissions"][number], unknown>
> = [
  {
    id: "permission",
    header: "Permission",
    cell: ({ row }) => (
      <AccessNameCell
        description={row.original.description}
        name={row.original.key}
      />
    ),
  },
  {
    id: "surface",
    header: "Surface",
    cell: ({ row }) => (
      <AccessTextCell value={getPermissionSurfaceLabel(row.original.key)} />
    ),
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => (
      <AccessActionBadge>
        {getPermissionActionLabel(row.original.key)}
      </AccessActionBadge>
    ),
  },
  {
    id: "granted",
    header: "Granted",
    cell: ({ row }) => (
      <Badge
        className={row.original.granted ? "" : "text-muted-foreground"}
        variant={row.original.granted ? "secondary" : "outline"}
      >
        {row.original.granted ? "Granted" : "Not granted"}
      </Badge>
    ),
  },
];

export function getRoleErrorMessage(error: unknown) {
  return getAppErrorMessage(error, {
    fallbackDetail: "Failed to load role.",
  });
}
