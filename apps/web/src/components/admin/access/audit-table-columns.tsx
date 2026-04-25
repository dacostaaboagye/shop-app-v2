"use client";

import type { AdminAuditEntry } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AccessActionBadge,
  AccessNameCell,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
import { formatAdminDate } from "@/lib/admin-models";

const ACTION_META: Record<AdminAuditEntry["action"], string> = {
  override_removed: "Override removed",
  override_set: "Override set",
  role_assigned: "Role assigned",
  role_revoked: "Role revoked",
};

export const auditTableColumns: Array<ColumnDef<AdminAuditEntry, unknown>> = [
  {
    accessorKey: "action",
    id: "action",
    header: "Action",
    cell: ({ row }) => (
      <AccessActionBadge>{ACTION_META[row.original.action]}</AccessActionBadge>
    ),
  },
  {
    id: "target",
    header: "Target",
    cell: ({ row }) => (
      <AccessNameCell
        description={
          row.original.locationName ?? row.original.roleSlug ?? "Global"
        }
        name={row.original.targetUserName ?? "System target"}
      />
    ),
  },
  {
    id: "change",
    header: "Change",
    cell: ({ row }) => (
      <AccessNameCell
        description={row.original.reason}
        name={row.original.permissionKey ?? "Role assignment"}
      />
    ),
  },
  {
    id: "actor",
    header: "Actor",
    cell: ({ row }) => (
      <AccessTextCell value={row.original.actorName ?? "System"} />
    ),
  },
  {
    accessorKey: "createdAt",
    id: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="type-support tabular-nums text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];
