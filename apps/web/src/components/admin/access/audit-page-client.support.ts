"use client";

import type { useRouter, useSearchParams } from "next/navigation";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const AUDIT_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export const AUDIT_SKELETON_KEYS = [
  "audit-row-1",
  "audit-row-2",
  "audit-row-3",
  "audit-row-4",
  "audit-row-5",
  "audit-row-6",
] as const;

export function getAuditErrorMessage(error: unknown) {
  return getAppErrorMessage(error, {
    fallbackDetail: "Failed to load audit log.",
  });
}

export function getAuditEntryRowKey(row: {
  action: string;
  createdAt: string;
  permissionKey: string | null;
  roleSlug: string | null;
  targetUserName: string | null;
}) {
  return [
    row.createdAt,
    row.action,
    row.permissionKey ?? row.roleSlug ?? "global",
    row.targetUserName ?? "system-target",
  ].join(":");
}

export function replaceAuditQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href), { scroll: false });
}
