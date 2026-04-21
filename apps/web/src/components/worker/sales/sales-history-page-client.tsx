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
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
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

const SKELETON_KEYS = [1, 2, 3, 4, 5];

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
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
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
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No sales recorded yet at this location.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {response.total} record{response.total !== 1 ? "s" : ""} found
      </p>
      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {response.items.map((invoice) => {
          const paymentLabel =
            invoice.paymentMethod === "mobile_money"
              ? "Mobile money"
              : invoice.paymentMethod
                ? invoice.paymentMethod.charAt(0).toUpperCase() +
                  invoice.paymentMethod.slice(1)
                : "-";

          return (
            <Link
              key={invoice.reference}
              className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent/40"
              href={toRoute(
                `/worker/sales/${encodeURIComponent(invoice.reference)}`,
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Receipt className="size-4" />
                </div>
                <div>
                  <p className="font-mono text-sm font-medium">
                    {invoice.reference}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(invoice.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Badge
                  variant={
                    invoice.type === "credit_note" ? "destructive" : "secondary"
                  }
                >
                  {invoice.type === "credit_note" ? "Return" : "Sale"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {paymentLabel}
                </span>
                <span className="font-medium tabular-nums">
                  {formatMoney(invoice.totalAmount, moneyProfile)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
