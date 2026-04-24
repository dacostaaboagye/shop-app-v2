"use client";

import type { AdminUserAccessDetail } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { MapPin } from "lucide-react";
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
      <div className="min-w-0">
        <p className="font-mono text-sm">{row.original.key}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.original.description}
        </p>
      </div>
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
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
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
      <Badge variant="secondary">
        {EVENT_TYPE_LABELS[row.original.eventType]}
      </Badge>
    ),
  },
  {
    id: "ipAddress",
    header: "IP address",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.original.ipAddress ?? "—"}
      </span>
    ),
  },
  {
    id: "userAgent",
    header: "User agent",
    cell: ({ row }) => (
      <p className="max-w-xs truncate text-xs text-muted-foreground">
        {row.original.userAgent ?? "—"}
      </p>
    ),
  },
  {
    id: "occurredAt",
    header: "Occurred",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
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
