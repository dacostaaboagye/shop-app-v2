"use client";

import type { AdminAuditEntry } from "@shop/contracts";
import Link from "next/link";
import {
  AccessActionBadge,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
import { formatAdminDate } from "@/lib/admin-models";
import { toRoute } from "@/lib/routes";

export const ACCESS_AUDIT_SKELETON_KEYS = [
  "access-audit-1",
  "access-audit-2",
  "access-audit-3",
  "access-audit-4",
] as const;

export function getAuditEntryKey(entry: AdminAuditEntry) {
  return [
    entry.createdAt,
    entry.action,
    entry.permissionKey ?? entry.roleSlug ?? "global",
    entry.targetUserName ?? "system-target",
  ].join(":");
}

export function AccessLinkCard({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className="rounded-xl border border-border/70 bg-muted/15 p-4 transition-colors hover:border-border hover:bg-muted/30"
      href={toRoute(href)}
    >
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

export function RecentAccessChangeCard({ entry }: { entry: AdminAuditEntry }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <AccessActionBadge>
          {entry.action.replaceAll("_", " ")}
        </AccessActionBadge>
        <span className="type-support text-muted-foreground">
          {entry.actorName ?? "System"} changed{" "}
          {entry.targetUserName ?? "a platform subject"}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground">{entry.reason}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <AccessTextCell
          tone="identifier"
          value={entry.permissionKey ?? entry.roleSlug ?? "Global scope"}
        />
        <span className="type-support tabular-nums text-muted-foreground">
          {formatAdminDate(entry.createdAt)}
        </span>
      </div>
    </div>
  );
}
