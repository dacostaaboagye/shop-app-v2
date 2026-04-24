"use client";

import type { AdminAuditEntry } from "@shop/contracts";
import Link from "next/link";
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
