"use client";

import type { AdminRoleSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  AccessCountCell,
  AccessNameCell,
} from "@/components/admin/access/access-table-cells";
import { Badge } from "@/components/ui/badge";
import { ROLE_SCOPE_BADGE_CLASSES } from "@/lib/admin-models";
import { toRoute } from "@/lib/routes";

export const roleTableColumns: Array<ColumnDef<AdminRoleSummary, unknown>> = [
  {
    accessorKey: "name",
    id: "name",
    header: "Role",
    cell: ({ row }) => (
      <Link
        className="block transition-colors hover:text-primary"
        href={toRoute(`/admin/access/roles/${row.original.slug}`)}
      >
        <AccessNameCell
          description={row.original.description}
          name={row.original.name}
          slug={row.original.slug}
        />
      </Link>
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
    cell: ({ row }) => <AccessCountCell value={row.original.permissionCount} />,
  },
  {
    accessorKey: "assignedUserCount",
    id: "assignedUserCount",
    header: "Assigned users",
    cell: ({ row }) => (
      <AccessCountCell value={row.original.assignedUserCount} />
    ),
  },
];
