"use client";

import type { Route } from "next";
import type { useRouter, useSearchParams } from "next/navigation";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const LOCATION_SORT_OPTIONS = [
  "name",
  "type",
  "status",
  "createdAt",
] as const;

export const LOCATION_STATUS_OPTIONS = ["all", "active", "inactive"] as const;

export const LOCATION_TYPE_OPTIONS = ["all", "store", "warehouse"] as const;

export const LOCATION_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const LOCATION_SKELETON_KEYS = [
  "location-row-1",
  "location-row-2",
  "location-row-3",
  "location-row-4",
  "location-row-5",
  "location-row-6",
] as const;

export function getLocationsErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load locations.";
}

export function replaceLocationQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href as Route), { scroll: false });
}
