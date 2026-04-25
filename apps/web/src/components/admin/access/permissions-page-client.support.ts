"use client";

import type { useRouter, useSearchParams } from "next/navigation";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const PERMISSION_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export const PERMISSION_SKELETON_KEYS = [
  "permission-row-1",
  "permission-row-2",
  "permission-row-3",
  "permission-row-4",
  "permission-row-5",
  "permission-row-6",
] as const;

export function getPermissionsErrorMessage(error: unknown) {
  return getAppErrorMessage(error, {
    fallbackDetail: "Failed to load permissions.",
  });
}

export function replacePermissionsQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href), { scroll: false });
}
