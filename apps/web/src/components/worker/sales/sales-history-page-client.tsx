"use client";

import type { InvoiceListResponse } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  type SalesDocumentTypeFilter,
  SalesListFilters,
} from "@/components/sales/sales-list-filters";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  formatCount,
  formatDateTime,
  formatPublicReference,
} from "@/lib/display/format";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchWorkerSales,
  workerSalesQueryKey,
} from "@/lib/react-query/pos-sales";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

const SKELETON_KEYS = [1, 2, 3, 4, 5] as const;

export function SalesHistoryPageClient() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [documentType, setDocumentType] =
    useState<SalesDocumentTypeFilter>("all");
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("pos.sales.view");

  const query = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    documentType,
    locationId: selectedLocationScope?.locationId ?? "",
    page: 1,
    pageSize: 25,
  };
  const salesQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchWorkerSales(query),
    queryKey: workerSalesQueryKey(query),
    staleTime: 30_000,
  });
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });

  return (
    <PageShell>
      <PageHeader
        description="Your recent sales and generated invoices."
        title="Sales history"
      />

      <LocationScopePanel
        description="Sales history loads from the location scope already assigned to your worker access."
        emptyDescription="No assigned location is available for your sales history."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Sales location"
      />

      <SalesListFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        documentType={documentType}
        onClear={() => {
          setDateFrom("");
          setDateTo("");
          setDocumentType("all");
        }}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onDocumentTypeChange={setDocumentType}
      />

      {salesQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-2">
          {SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-14 w-full" />
          ))}
        </div>
      ) : salesQuery.isError ? (
        <AppErrorBanner
          detail="Could not load sales history."
          error={salesQuery.error}
          onRetry={() => void salesQuery.refetch()}
          title="Unable to load sales"
        />
      ) : salesQuery.data ? (
        <SalesList
          moneyProfile={profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE}
          response={salesQuery.data}
        />
      ) : null}
    </PageShell>
  );
}

function SalesList({
  moneyProfile,
  response,
}: {
  moneyProfile: MoneyProfile;
  response: InvoiceListResponse;
}) {
  if (response.items.length === 0) {
    return (
      <AppEmptyState
        description="No sales have been recorded at this location yet."
        icon={Receipt}
        title="No sales recorded"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="type-data-label px-1">
        {formatCount(response.total)} record{response.total !== 1 ? "s" : ""}{" "}
        found
      </p>
      <AppTableWrapper>
        {response.items.map((invoice, index) => {
          const paymentLabel =
            invoice.paymentMethod === "mobile_money"
              ? "Mobile money"
              : invoice.paymentMethod
                ? invoice.paymentMethod.charAt(0).toUpperCase() +
                  invoice.paymentMethod.slice(1)
                : "Other";

          return (
            <Link
              key={invoice.reference}
              className={cn(
                "flex flex-col gap-3 p-5 transition-all hover:bg-muted/30 active:bg-muted/80 sm:flex-row sm:items-center sm:justify-between",
                index !== response.items.length - 1 &&
                  "border-b border-border/50",
              )}
              href={toRoute(
                `/worker/sales/${encodeURIComponent(invoice.reference)}`,
              )}
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Receipt className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="type-data-value text-sm">
                    {formatPublicReference(invoice.reference)}
                  </p>
                  <p className="type-support mt-0.5 text-xs">
                    {formatDateTime(invoice.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-3 text-sm sm:w-auto sm:justify-end sm:flex-nowrap sm:gap-4">
                <Badge
                  className="rounded-lg border-none px-2 py-0.5 text-[10px] font-bold shadow-sm"
                  variant={
                    invoice.type === "credit_note" ? "destructive" : "secondary"
                  }
                >
                  {invoice.type === "credit_note" ? "Credit Note" : "Sale"}
                </Badge>
                <span className="type-data-label text-[10px]">
                  {paymentLabel}
                </span>
                <span className="type-data-value text-base tabular-nums">
                  {formatMoney(invoice.totalAmount, moneyProfile)}
                </span>
              </div>
            </Link>
          );
        })}
      </AppTableWrapper>
    </div>
  );
}
