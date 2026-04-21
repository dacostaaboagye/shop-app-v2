"use client";

import type { AdminUserSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { PreviewImage } from "@/components/system/preview-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  formatAdminDate,
  formatDisplayName,
  getInitials,
  USER_STATUS_META,
} from "@/lib/admin-models";

export const supplierColumns: ColumnDef<AdminUserSummary>[] = [
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-3">
          {user.primaryImageUrl ? (
            <PreviewImage
              alt={formatDisplayName(user.firstName, user.lastName)}
              className="size-10 rounded-full"
              height={40}
              imageClassName="rounded-full"
              previewTitle={formatDisplayName(user.firstName, user.lastName)}
              src={user.primaryImageUrl}
              width={40}
            />
          ) : (
            <Avatar>
              <AvatarFallback>
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <p className="font-medium leading-none">
              {formatDisplayName(user.firstName, user.lastName)}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      );
    },
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
    id: "lastLoginAt",
    enableSorting: false,
    header: "Last login",
    cell: ({ row }) =>
      row.original.lastLoginAt ? (
        <span className="tabular-nums text-sm text-muted-foreground">
          {formatAdminDate(row.original.lastLoginAt)}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Never</span>
      ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];
