"use client";

import type { AdminPermissionSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AccessActionBadge,
  AccessCountCell,
  AccessNameCell,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
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
    accessorKey: "assignedRoleCount",
    id: "assignedRoleCount",
    header: "Assigned roles",
    cell: ({ row }) => (
      <AccessCountCell value={row.original.assignedRoleCount} />
    ),
  },
];
