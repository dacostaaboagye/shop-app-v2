"use client";

import type { useRouter, useSearchParams } from "next/navigation";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const SALES_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function replaceSalesQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href), { scroll: false });
}
