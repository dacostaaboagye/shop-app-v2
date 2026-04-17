"use client";

import type { useRouter, useSearchParams } from "next/navigation";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const ROLE_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const ROLE_SKELETON_KEYS = [
  "role-row-1",
  "role-row-2",
  "role-row-3",
  "role-row-4",
  "role-row-5",
  "role-row-6",
] as const;

export function getRolesErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load roles.";
}

export function replaceRolesQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href), { scroll: false });
}
