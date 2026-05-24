"use client";

import type { AdminCustomerListQuery } from "@shop/contracts";
import type { Route } from "next";
import type { useRouter, useSearchParams } from "next/navigation";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { toRoute } from "@/lib/routes";
import { buildSearchParams } from "@/lib/url-state";

export const CUSTOMER_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const CUSTOMER_TABLE_SKELETON_KEYS = [
  "customer-row-1",
  "customer-row-2",
  "customer-row-3",
  "customer-row-4",
  "customer-row-5",
  "customer-row-6",
] as const;

export function createCustomerQuery(input: {
  dir: AdminCustomerListQuery["dir"];
  page: number;
  pageSize: number;
  q: string;
  sort: AdminCustomerListQuery["sort"];
  status: AdminCustomerListQuery["status"];
  type: AdminCustomerListQuery["type"];
}): AdminCustomerListQuery {
  return {
    dir: input.dir,
    page: input.page,
    pageSize: input.pageSize,
    q: input.q,
    sort: input.sort,
    status: input.status,
    type: input.type,
  };
}

export function getCustomersErrorMessage(error: unknown) {
  return getAppErrorMessage(error, {
    fallbackDetail: "Failed to load customers.",
  });
}

export function replaceCustomersQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href as Route), { scroll: false });
}
