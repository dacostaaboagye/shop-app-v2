"use client";

import type { InvoiceListResponse } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Receipt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  type SalesDocumentTypeFilter,
  SalesListFilters,
} from "@/components/sales/sales-list-filters";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  formatMoney,
  type MoneyProfile,
  toNumericAmount,
} from "@/lib/money/format-money";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchManagerSales,
  managerSalesQueryKey,
} from "@/lib/react-query/pos-sales";
import { toRoute } from "@/lib/routes";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { cn } from "@/lib/utils";

export function ManagerSalesPageClient() {
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
  } = usePermissionLocationScope("pos.sales.manage");

  const query = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    documentType,
    locationId: selectedLocationScope?.locationId ?? "",
    page: 1,
    pageSize: 50,
  };
  const salesQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchManagerSales(query),
    queryKey: managerSalesQueryKey(query),
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

  const items = salesQuery.data?.items ?? [];
  const posItems = items.filter((i) => i.type === "pos");
  const totalRevenue = posItems.reduce(
    (sum, i) => sum + (toNumericAmount(i.totalAmount) ?? 0),
    0,
  );
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;

  return (
    <PageShell>
      <PageHeader
        description="All POS sales and credit notes for this location."
        title="Sales overview"
      />

      <LocationScopePanel
        description="Sales visibility follows the location scopes already granted to your manager access."
        emptyDescription="No managed location is available for sales oversight."
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
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {SKELETON_KEYS.map((k) => (
              <Skeleton key={k} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : salesQuery.isError ? (
        <AppErrorBanner
          detail="Could not load sales data."
          error={salesQuery.error}
          onRetry={() => void salesQuery.refetch()}
          title="Unable to load sales"
        />
      ) : salesQuery.data ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Receipt}
              label="Total transactions"
              value={salesQuery.data.total}
            />
            <StatCard
              icon={BarChart3}
              label="POS sales"
              value={posItems.length}
            />
            <StatCard
              icon={BarChart3}
              label="Total revenue"
              value={formatMoney(totalRevenue, moneyProfile)}
            />
          </div>
          <SalesList moneyProfile={moneyProfile} response={salesQuery.data} />
        </div>
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
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border/60 bg-muted/5 p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-foreground">No sales recorded</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground/80">
          No transactions have been recorded at this location for the selected
          period.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
        Transaction history ({response.total})
      </h3>
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
                "flex items-center justify-between gap-4 p-4 transition-all hover:bg-muted/30 group",
                index !== response.items.length - 1 &&
                  "border-b border-border/50",
              )}
              href={toRoute(
                `/manager/sales/${encodeURIComponent(invoice.reference)}`,
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary/10">
                  <Receipt className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-foreground truncate">
                    {invoice.reference}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    {new Date(invoice.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="hidden flex-col items-end sm:flex">
                  <Badge
                    className="rounded-md font-bold uppercase tracking-wider text-[10px]"
                    variant={
                      invoice.type === "credit_note"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {invoice.type === "credit_note" ? "Return" : "Sale"}
                  </Badge>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                    {paymentLabel}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatMoney(invoice.totalAmount, moneyProfile)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 group-hover:text-primary transition-colors">
                    Details →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </AppTableWrapper>
    </div>
  );
}
