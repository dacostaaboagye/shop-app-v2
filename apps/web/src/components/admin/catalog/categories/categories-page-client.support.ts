"use client";

import type { Route } from "next";
import type { useRouter, useSearchParams } from "next/navigation";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const CATEGORY_SORT_OPTIONS = ["name", "status", "createdAt"] as const;
export const CATEGORY_STATUS_OPTIONS = ["all", "active", "archived"] as const;
export const CATEGORY_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const CATEGORY_SKELETON_KEYS = [
  "category-row-1",
  "category-row-2",
  "category-row-3",
  "category-row-4",
  "category-row-5",
] as const;

export function getCategoriesErrorMessage(error: unknown) {
  return getAppErrorMessage(error, {
    fallbackDetail: "Failed to load categories.",
  });
}

export function replaceCategoryQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href as Route), { scroll: false });
}
