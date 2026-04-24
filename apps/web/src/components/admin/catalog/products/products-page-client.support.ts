"use client";

import type { Route } from "next";
import type { useRouter, useSearchParams } from "next/navigation";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const PRODUCT_SORT_OPTIONS = ["name", "status", "createdAt"] as const;
export const PRODUCT_STATUS_OPTIONS = ["all", "active", "archived"] as const;
export const PRODUCT_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const PRODUCT_SKELETON_KEYS = [
  "product-row-1",
  "product-row-2",
  "product-row-3",
  "product-row-4",
  "product-row-5",
] as const;

export function getProductsErrorMessage(error: unknown) {
  return getAppErrorMessage(error, {
    fallbackDetail: "Failed to load products.",
  });
}

export function replaceProductQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href as Route), { scroll: false });
}
