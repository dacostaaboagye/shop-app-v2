"use client";

import type { AdminProductDetail } from "@shop/contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import { VariantCountPanel } from "@/components/admin/stock/stock-count-workspace-panels";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  StockCountFormProps,
  StockCountInitialTarget,
} from "./stock-count-form.support";

export function SelectedProductPanel({
  balanceError,
  balanceLoading,
  detailQuery,
  error,
  initialTarget,
  isPending,
  locationSlug,
  onSelectVariant,
  onRetryBalance,
  onSubmit,
  selectedBalance,
  selectedProductSlug,
  selectedVariantSku,
}: {
  balanceError: unknown;
  balanceLoading: boolean;
  detailQuery: UseQueryResult<AdminProductDetail>;
  error: unknown;
  initialTarget: StockCountInitialTarget | null;
  isPending: boolean;
  locationSlug: string;
  onSelectVariant: (sku: string) => void;
  onRetryBalance: () => void;
  onSubmit: StockCountFormProps["onSubmit"];
  selectedBalance: StockCountFormProps["row"];
  selectedProductSlug: string;
  selectedVariantSku: string;
}) {
  if (!selectedProductSlug) {
    return (
      <AppEmptyState
        description="Choose a product from the searchable list to load its SKUs and count form."
        title="Select a product"
      />
    );
  }

  if (detailQuery.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <AppErrorBanner
        detail="Could not load product SKUs."
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        title="Unable to load product"
      />
    );
  }

  return (
    <VariantCountPanel
      balanceError={balanceError}
      balanceLoading={balanceLoading}
      error={error}
      initialTarget={initialTarget}
      isPending={isPending}
      locationSlug={locationSlug}
      onSelectVariant={onSelectVariant}
      onRetryBalance={onRetryBalance}
      onSubmit={onSubmit}
      productName={detailQuery.data?.name ?? ""}
      selectedBalance={selectedBalance}
      selectedVariantSku={selectedVariantSku}
      variants={detailQuery.data?.variants ?? []}
    />
  );
}
