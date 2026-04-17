"use client";

import type { AdminAuditEntry } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
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
      <Badge
        className="border-border bg-muted/30 text-foreground"
        variant="outline"
      >
        {ACTION_META[row.original.action]}
      </Badge>
    ),
  },
  {
    id: "target",
    header: "Target",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium">
          {row.original.targetUserName ?? "System target"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.original.locationName ?? row.original.roleSlug ?? "Global"}
        </p>
      </div>
    ),
  },
  {
    id: "change",
    header: "Change",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-mono text-xs text-foreground">
          {row.original.permissionKey ?? "role assignment"}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {row.original.reason}
        </p>
      </div>
    ),
  },
  {
    id: "actor",
    header: "Actor",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.actorName ?? "System"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    id: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];
