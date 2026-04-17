"use client";

import type { Route } from "next";
import type { useRouter, useSearchParams } from "next/navigation";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const USER_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const USER_STATUS_FILTER_OPTIONS = [
  "all",
  "active",
  "suspended",
  "deactivated",
] as const;

export const USER_SORT_OPTIONS = ["name", "status", "createdAt"] as const;

export const USER_TABLE_SKELETON_KEYS = [
  "user-row-1",
  "user-row-2",
  "user-row-3",
  "user-row-4",
  "user-row-5",
  "user-row-6",
] as const;

export type UsersPageClientProps = {
  description?: string;
  title?: string;
  userDetailBasePath?: string;
};

export function getUsersErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load users.";
}

export function replaceUserQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href as Route), { scroll: false });
}
