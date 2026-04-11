"use client";

import type { Route } from "next";
import type { useRouter, useSearchParams } from "next/navigation";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const BRAND_SORT_OPTIONS = ["name", "status", "createdAt"] as const;
export const BRAND_STATUS_OPTIONS = ["all", "active", "archived"] as const;
export const BRAND_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const BRAND_SKELETON_KEYS = [
  "brand-row-1",
  "brand-row-2",
  "brand-row-3",
  "brand-row-4",
  "brand-row-5",
] as const;

export function getBrandsErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load brands.";
}

export function replaceBrandQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href as Route), { scroll: false });
}
