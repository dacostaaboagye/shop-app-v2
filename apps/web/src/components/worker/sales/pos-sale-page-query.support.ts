"use client";

import type { useRouter, useSearchParams } from "next/navigation";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export function replacePosSaleQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href), { scroll: false });
}
