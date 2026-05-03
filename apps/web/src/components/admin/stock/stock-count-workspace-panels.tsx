"use client";

import type { AdminProductSummary, AdminVariantSummary } from "@shop/contracts";
import { StockCountForm } from "@/components/admin/stock/stock-count-form";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  StockCountFormProps,
  StockCountInitialTarget,
} from "./stock-count-form.support";
import { getActiveStockCountVariants } from "./stock-count-workspace.support";

export function ProductSearchResults({
  activeSearch,
  canLoadMore,
  isError,
  isLoadingMore,
  isPending,
  onLoadMore,
  onRetry,
  onSelect,
  products,
  selectedProductSlug,
  totalCount,
}: {
  activeSearch: string;
  canLoadMore: boolean;
  isError: boolean;
  isLoadingMore: boolean;
  isPending: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelect: (product: AdminProductSummary) => void;
  products: ReadonlyArray<AdminProductSummary>;
  selectedProductSlug: string;
  totalCount: number;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((key) => (
          <Skeleton className="h-14 rounded-lg" key={key} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <AppErrorBanner
        detail="Could not load products for counting."
        onRetry={onRetry}
        title="Unable to load products"
      />
    );
  }

  if (products.length === 0) {
    return (
      <AppEmptyState
        description={
          activeSearch
            ? "Try a different product name or open quick count and enter the SKU directly."
            : "Showing the first active products. Search to narrow the list."
        }
        kind="no-results"
        title="No products found"
      />
    );
  }

  return (
    <div className="rounded-lg border border-border/50">
      <p className="border-border/50 border-b px-3 py-2 text-xs text-muted-foreground">
        Showing {products.length} of {totalCount} matching products
      </p>
      <div className="max-h-96 overflow-y-auto">
        {products.map((product) => (
          <button
            aria-pressed={product.slug === selectedProductSlug}
            className="flex min-h-12 w-full items-center justify-between gap-3 border-border/50 border-b p-3 text-left transition-colors hover:bg-muted/40 data-[selected=true]:bg-primary/10"
            data-selected={product.slug === selectedProductSlug}
            key={product.slug}
            onClick={() => onSelect(product)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{product.name}</span>
              <span className="type-support text-xs">
                {product.variantCount} SKU
                {product.variantCount === 1 ? "" : "s"}
              </span>
            </span>
          </button>
        ))}
      </div>
      {canLoadMore ? (
        <div className="border-border/50 border-t p-2">
          <Button
            className="w-full"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            type="button"
            variant="outline"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function VariantCountPanel({
  balanceError,
  balanceLoading,
  error,
  initialTarget,
  isPending,
  locationSlug,
  onSelectVariant,
  onRetryBalance,
  onSubmit,
  productName,
  selectedBalance,
  selectedVariantSku,
  variants,
}: {
  balanceError: unknown;
  balanceLoading: boolean;
  error: unknown;
  initialTarget: StockCountInitialTarget | null;
  isPending: boolean;
  locationSlug: string;
  onSelectVariant: (sku: string) => void;
  onRetryBalance: () => void;
  onSubmit: StockCountFormProps["onSubmit"];
  productName: string;
  selectedBalance: StockCountFormProps["row"];
  selectedVariantSku: string;
  variants: ReadonlyArray<AdminVariantSummary>;
}) {
  const activeVariants = getActiveStockCountVariants(variants);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="type-data-label text-muted-foreground">
          Selected product
        </p>
        <h3 className="mt-1 font-semibold">{productName}</h3>
        <CardDescription>
          Pick the SKU counted at this location. Existing stock is prefilled
          when this SKU already has a balance.
        </CardDescription>
      </div>

      {activeVariants.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {activeVariants.map((variant) => (
            <button
              aria-pressed={variant.sku === selectedVariantSku}
              className="min-h-12 rounded-lg border border-border/60 bg-card p-3 text-left transition-colors hover:bg-muted/40 data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/10"
              data-selected={variant.sku === selectedVariantSku}
              key={variant.slug}
              onClick={() => onSelectVariant(variant.sku)}
              type="button"
            >
              <span className="block font-medium">{variant.name}</span>
              <span className="mt-1 block font-mono text-xs text-muted-foreground">
                {variant.sku}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <AppEmptyState
          description="This product has no active SKU to count."
          title="No active SKU"
        />
      )}

      {selectedVariantSku ? (
        balanceLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : balanceError ? (
          <AppErrorBanner
            detail="Could not load the current quantity for this SKU. Retry before entering a count."
            error={balanceError}
            onRetry={onRetryBalance}
            title="Unable to load current stock"
          />
        ) : (
          <StockCountForm
            key={`${locationSlug}:${selectedVariantSku}`}
            error={error}
            initialTarget={initialTarget}
            isPending={isPending}
            locationSlug={locationSlug}
            onCancel={() => onSelectVariant("")}
            onSubmit={onSubmit}
            row={selectedBalance}
          />
        )
      ) : (
        <AppEmptyState
          description="Select a SKU above to prefill the count form."
          title="Select a SKU"
        />
      )}
    </div>
  );
}
