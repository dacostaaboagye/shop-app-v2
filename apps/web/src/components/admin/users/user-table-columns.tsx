"use client";

import type { AdminUserSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  deriveAvailablePortals,
  formatAdminDate,
  formatDisplayName,
  getInitials,
  PASSWORD_RESET_BADGE_CLASS_NAME,
  ROLE_BADGE_CLASSES,
  type RoleKey,
  USER_STATUS_META,
} from "@/lib/admin-models";
import { cn } from "@/lib/utils";

export const userTableColumns: Array<ColumnDef<AdminUserSummary, unknown>> = [
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <div className="flex items-center gap-3">
          <Avatar>
            {user.primaryImageUrl ? (
              <AvatarImage
                alt={formatDisplayName(user.firstName, user.lastName)}
                src={user.primaryImageUrl}
              />
            ) : null}
            <AvatarFallback>
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium leading-none">
              {formatDisplayName(user.firstName, user.lastName)}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {user.email}
            </p>
            {user.requiresPasswordChange ? (
              <Badge
                className={cn(
                  "mt-1 inline-flex w-fit text-[0.7rem]",
                  PASSWORD_RESET_BADGE_CLASS_NAME,
                )}
                variant="outline"
              >
                <Clock className="size-3" />
                Password reset required
              </Badge>
            ) : null}
          </div>
        </div>
      );
    },
  },
  {
    id: "roles",
    enableSorting: false,
    header: "Roles",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.roles.map((role) => (
          <Badge
            key={role.slug}
            className={cn(
              "capitalize text-[0.68rem]",
              ROLE_BADGE_CLASSES[role.slug as RoleKey] ??
                "border-border bg-muted/25",
            )}
            variant="outline"
          >
            {role.name}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const meta = USER_STATUS_META[row.original.status];

      return (
        <Badge className={meta.className} variant="outline">
          {meta.label}
        </Badge>
      );
    },
  },
  {
    id: "assignments",
    enableSorting: false,
    header: "Assignments",
    cell: ({ row }) =>
      row.original.assignedLocations.length ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm">
            {row.original.assignedLocations
              .slice(0, 2)
              .map((location) => location.name)
              .join(", ")}
          </span>
          {row.original.assignedLocations.length > 2 ? (
            <span className="text-xs text-muted-foreground">
              +{row.original.assignedLocations.length - 2} more
            </span>
          ) : null}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">No assignments</span>
      ),
  },
  {
    id: "portals",
    enableSorting: false,
    header: "Portals",
    cell: ({ row }) => {
      const portals = deriveAvailablePortals(
        row.original.roles.map((role) => role.slug),
      );

      return portals.length ? (
        <span className="text-sm capitalize text-muted-foreground">
          {portals.join(", ")}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">None</span>
      );
    },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];

/** @deprecated Use `userTableColumns` directly — rows are navigated via `onRowClick` on AppDataTable. */
export function createUserTableColumns(
  _userDetailBasePath?: string,
): Array<ColumnDef<AdminUserSummary, unknown>> {
  return userTableColumns;
}
