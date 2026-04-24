"use client";

import type { AdminRoleSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ROLE_SCOPE_BADGE_CLASSES } from "@/lib/admin-models";
import { toRoute } from "@/lib/routes";

export const roleTableColumns: Array<ColumnDef<AdminRoleSummary, unknown>> = [
  {
    accessorKey: "name",
    id: "name",
    header: "Role",
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          className="font-medium hover:text-primary"
          href={toRoute(`/admin/access/roles/${row.original.slug}`)}
        >
          {row.original.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {row.original.description}
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {row.original.slug}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "isSystem",
    id: "scope",
    header: "Scope",
    cell: ({ row }) => (
      <Badge
        className={
          row.original.isSystem
            ? ROLE_SCOPE_BADGE_CLASSES.system
            : ROLE_SCOPE_BADGE_CLASSES.custom
        }
        variant="outline"
      >
        {row.original.isSystem ? "System" : "Custom"}
      </Badge>
    ),
  },
  {
    accessorKey: "permissionCount",
    id: "permissionCount",
    header: "Permissions",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.original.permissionCount}
      </span>
    ),
  },
  {
    accessorKey: "assignedUserCount",
    id: "assignedUserCount",
    header: "Assigned users",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.original.assignedUserCount}
      </span>
    ),
  },
];
