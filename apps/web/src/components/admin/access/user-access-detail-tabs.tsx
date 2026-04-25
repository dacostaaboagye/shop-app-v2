"use client";

import type { AdminUserAccessDetail } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { MapPin } from "lucide-react";
import {
  AccessActionBadge,
  AccessNameCell,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { Badge } from "@/components/ui/badge";
import { formatAdminDate, ROLE_SCOPE_BADGE_CLASSES } from "@/lib/admin-models";

type EffectivePermission =
  AdminUserAccessDetail["effectivePermissions"][number];
type ActivityEvent = AdminUserAccessDetail["recentActivity"][number];

const effectiveColumns: Array<ColumnDef<EffectivePermission, unknown>> = [
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
    id: "source",
    header: "Source",
    cell: ({ row }) => (
      <Badge
        className={
          row.original.source === "override"
            ? ROLE_SCOPE_BADGE_CLASSES.system
            : ""
        }
        variant={row.original.source === "override" ? "outline" : "secondary"}
      >
        {row.original.source === "override" ? "Override" : "Role"}
      </Badge>
    ),
  },
  {
    id: "scope",
    header: "Scope",
    cell: ({ row }) =>
      row.original.locationName ? (
        <span className="type-support flex items-center gap-1 text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          {row.original.locationName}
        </span>
      ) : (
        <Badge variant="secondary">Global</Badge>
      ),
  },
];

const EVENT_TYPE_LABELS: Record<ActivityEvent["eventType"], string> = {
  failed_attempt: "Failed attempt",
  lockout: "Account lockout",
  login: "Login",
  logout: "Logout",
  token_refresh: "Token refresh",
};

const activityColumns: Array<ColumnDef<ActivityEvent, unknown>> = [
  {
    id: "event",
    header: "Event",
    cell: ({ row }) => (
      <AccessActionBadge>
        {EVENT_TYPE_LABELS[row.original.eventType]}
      </AccessActionBadge>
    ),
  },
  {
    id: "ipAddress",
    header: "IP address",
    cell: ({ row }) => (
      <AccessTextCell
        tone="identifier"
        value={row.original.ipAddress ?? "Not set"}
      />
    ),
  },
  {
    id: "userAgent",
    header: "User agent",
    cell: ({ row }) => (
      <div className="max-w-xs">
        <AccessTextCell value={row.original.userAgent ?? "Not set"} />
      </div>
    ),
  },
  {
    id: "occurredAt",
    header: "Occurred",
    cell: ({ row }) => (
      <span className="type-support tabular-nums text-muted-foreground">
        {formatAdminDate(row.original.occurredAt)}
      </span>
    ),
  },
];

export function EffectiveAccessTab({
  permissions,
}: {
  permissions: readonly EffectivePermission[];
}) {
  return (
    <AppDataTable
      columns={effectiveColumns}
      data={permissions as EffectivePermission[]}
      density="compact"
      emptyDescription="No resolved permissions from roles or overrides."
      emptyTitle="No effective permissions"
      getRowId={(row) => `${row.key}:${row.locationSlug ?? "global"}`}
    />
  );
}

export function ActivityTab({ events }: { events: readonly ActivityEvent[] }) {
  return (
    <AppDataTable
      columns={activityColumns}
      data={events as ActivityEvent[]}
      density="compact"
      emptyDescription="No recent authentication activity."
      emptyTitle="No activity"
      getRowId={(row) =>
        `${row.occurredAt}:${row.eventType}:${row.ipAddress ?? "unknown"}`
      }
    />
  );
}
