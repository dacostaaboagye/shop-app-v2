"use client";

import type { InvoiceListResponse } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Receipt } from "lucide-react";
import Link from "next/link";
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

export function ManagerSalesPageClient() {
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("pos.sales.manage");

  const query = {
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

      {salesQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-2">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
          ))}
        </div>
      ) : salesQuery.isError ? (
        <AppErrorBanner
          detail="Could not load sales data."
          error={salesQuery.error}
          onRetry={() => void salesQuery.refetch()}
          title="Unable to load sales"
        />
      ) : salesQuery.data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        </>
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
        {response.total} record{response.total !== 1 ? "s" : ""}
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
                `/manager/sales/${encodeURIComponent(invoice.reference)}`,
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
                <span className="hidden text-xs text-muted-foreground sm:block">
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
