"use client";

import type { useSearchParams } from "next/navigation";
import { createDefaultSalesLedgerDateRange } from "@/components/sales/sales-ledger-support";
import { SALES_PAGE_SIZE_OPTIONS } from "@/components/sales/sales-page-query.support";
import {
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";

export const ADMIN_SALES_DEFAULT_DATE_RANGE =
  createDefaultSalesLedgerDateRange();

type SearchParams = ReturnType<typeof useSearchParams>;

export function readAdminSalesQueryState(searchParams: SearchParams) {
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 25);

  return {
    channel: readEnumParam(
      searchParams,
      "channel",
      ["all", "ecommerce", "manual", "portal", "pos"] as const,
      "all",
    ),
    classification: readEnumParam(
      searchParams,
      "classification",
      ["all", "internal", "outgoing"] as const,
      "all",
    ),
    currentPayableOnly:
      readStringParam(searchParams, "currentPayableOnly") === "true",
    dateFrom:
      readStringParam(searchParams, "dateFrom") ||
      ADMIN_SALES_DEFAULT_DATE_RANGE.dateFrom,
    dateTo:
      readStringParam(searchParams, "dateTo") ||
      ADMIN_SALES_DEFAULT_DATE_RANGE.dateTo,
    documentType: readEnumParam(
      searchParams,
      "documentType",
      ["adjusted", "all", "credit_note", "invoice"] as const,
      "all",
    ),
    page: readPositiveIntParam(searchParams, "page", 1),
    pageSize: SALES_PAGE_SIZE_OPTIONS.includes(
      rawPageSize as (typeof SALES_PAGE_SIZE_OPTIONS)[number],
    )
      ? rawPageSize
      : 25,
    querySearch: readStringParam(searchParams, "q"),
    status: readEnumParam(
      searchParams,
      "status",
      ["all", "confirmed", "superseded", "voided"] as const,
      "all",
    ),
  };
}
