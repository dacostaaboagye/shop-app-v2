import type { VariantSearchResult } from "@shop/contracts";
import { Search } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  error: unknown;
  isFetching: boolean;
  items: VariantSearchResult[];
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelect: (item: VariantSearchResult) => void;
  query: string;
  reviewedSkus: ReadonlySet<string>;
  selectedSku: string | null;
  submittedQuery: string;
  totalCount: number;
};

export function OpeningStockProductPicker({
  error,
  isFetching,
  items,
  onRetry,
  onSearchChange,
  onSearchSubmit,
  onSelect,
  query,
  reviewedSkus,
  selectedSku,
  submittedQuery,
  totalCount,
}: Props) {
  const hasPendingSearch = query.trim() !== submittedQuery;

  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Find product</h3>
        <p className="text-sm text-muted-foreground">
          Search by product name or SKU, then select the product for opening
          stock.
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <AppFormField inputId="opening-stock-product-search" label="Search">
          <Input
            autoComplete="off"
            id="opening-stock-product-search"
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (isFetching) return;
              onSearchSubmit();
            }}
            placeholder="Product name or SKU"
            value={query}
          />
        </AppFormField>
        <Button
          className="sm:self-end"
          disabled={isFetching}
          onClick={onSearchSubmit}
          type="button"
        >
          <Search data-icon="inline-start" />
          Search
        </Button>
      </div>
      {hasPendingSearch ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Press Search to update the product list.
        </p>
      ) : null}
      {isFetching && items.length > 0 ? (
        <output className="mt-2 block text-xs text-muted-foreground">
          Updating product list...
        </output>
      ) : null}

      <div
        aria-busy={isFetching ? true : undefined}
        className="mt-3 flex max-h-80 flex-col gap-2 overflow-auto xl:max-h-[34rem]"
      >
        {error ? (
          <AppErrorBanner
            detail="Could not load products for this location."
            error={error}
            onRetry={onRetry}
            title="Unable to load products"
          />
        ) : isFetching && items.length === 0 ? (
          <ProductListSkeleton />
        ) : items.length === 0 ? (
          <AppEmptyState
            className="py-6"
            description={
              submittedQuery
                ? "No product or SKU matches that search for this location."
                : "No products are available for opening stock at this location."
            }
            kind={submittedQuery ? "no-results" : "no-data"}
            title={submittedQuery ? "No matching product" : "No products found"}
          />
        ) : (
          items.map((item) => {
            const reviewed = reviewedSkus.has(item.sku.toUpperCase());
            const selected = selectedSku === item.sku;
            const initialized = item.openingStockStatus === "initialized";

            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "rounded-lg border border-border/60 bg-card/80 p-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-primary bg-primary/5" : null,
                  initialized && !selected ? "opacity-75" : null,
                )}
                key={`${item.productSlug}:${item.sku}`}
                onClick={() => onSelect(item)}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.productName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {item.sku}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {reviewed ? (
                      <Badge variant="secondary">In review</Badge>
                    ) : null}
                    {initialized ? (
                      <Badge variant="outline">Opening set</Badge>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Current on hand:{" "}
                  <span className="font-semibold text-foreground">
                    {item.onHandQuantity}
                  </span>
                </p>
              </button>
            );
          })
        )}
      </div>
      {totalCount > items.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {items.length} of {totalCount}. Search by product name or SKU
          to narrow the list.
        </p>
      ) : null}
    </div>
  );
}

function ProductListSkeleton() {
  return (
    <>
      {["opening-product-1", "opening-product-2", "opening-product-3"].map(
        (key) => (
          <div
            className="rounded-lg border border-border/60 bg-card/80 p-3"
            key={key}
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-3 h-3 w-2/5" />
          </div>
        ),
      )}
    </>
  );
}
