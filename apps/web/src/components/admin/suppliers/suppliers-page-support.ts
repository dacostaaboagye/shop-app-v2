"use client";

import type { AdminSupplierListQuery } from "@shop/contracts";
import type { Route } from "next";
import type { useRouter, useSearchParams } from "next/navigation";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const SUPPLIER_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const SUPPLIER_TABLE_SKELETON_KEYS = [
  "supplier-row-1",
  "supplier-row-2",
  "supplier-row-3",
  "supplier-row-4",
  "supplier-row-5",
  "supplier-row-6",
] as const;

export function createSupplierQuery(input: {
  dir: AdminSupplierListQuery["dir"];
  page: number;
  pageSize: number;
  q: string;
  sort: AdminSupplierListQuery["sort"];
  status: AdminSupplierListQuery["status"];
}): AdminSupplierListQuery {
  return {
    dir: input.dir,
    page: input.page,
    pageSize: input.pageSize,
    q: input.q,
    sort: input.sort,
    status: input.status,
  };
}

export function getSuppliersErrorMessage(error: unknown) {
  return getAppErrorMessage(error, {
    fallbackDetail: "Failed to load suppliers.",
  });
}

export function replaceSuppliersQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href as Route), { scroll: false });
}
