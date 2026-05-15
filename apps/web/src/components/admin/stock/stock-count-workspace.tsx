"use client";

import type { AdminProductSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { SelectedProductPanel } from "@/components/admin/stock/stock-count-selected-product-panel";
import { ProductSearchResults } from "@/components/admin/stock/stock-count-workspace-panels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adminProductQueryKey,
  adminProductsQueryKey,
  fetchAdminProduct,
  fetchAdminProducts,
} from "@/lib/react-query/admin-catalog-products";
import {
  fetchStockBalances,
  stockBalancesQueryKey,
} from "@/lib/react-query/stock-admin";
import type { StockCountFormProps } from "./stock-count-form.support";
import {
  buildStockCountBalanceLookupQuery,
  buildStockCountInitialTarget,
  buildStockCountProductQuery,
  findStockCountBalance,
  getSelectedStockCountProduct,
} from "./stock-count-workspace.support";

type Props = Pick<
  StockCountFormProps,
  "error" | "isPending" | "locationSlug" | "onSubmit"
> & {
  locationName: string;
};

export function StockCountWorkspace({
  error,
  isPending,
  locationName,
  locationSlug,
  onSubmit,
}: Props) {
  const [draftSearch, setDraftSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [selectedProductSlug, setSelectedProductSlug] = useState("");
  const [selectedVariantSku, setSelectedVariantSku] = useState("");

  const productQuery = buildStockCountProductQuery({
    page: productPage,
    search: activeSearch,
  });
  const productsQuery = useQuery({
    enabled: !!locationSlug,
    placeholderData: (previous) => previous,
    queryFn: () => fetchAdminProducts(productQuery),
    queryKey: adminProductsQueryKey(productQuery),
    staleTime: 30_000,
  });
  const detailQuery = useQuery({
    enabled: !!selectedProductSlug,
    queryFn: () => fetchAdminProduct(selectedProductSlug),
    queryKey: adminProductQueryKey(selectedProductSlug),
    staleTime: 30_000,
  });

  const selectedProduct = getSelectedStockCountProduct({
    detail: detailQuery.data,
    products: getVisibleProducts(productsQuery.data?.items ?? []),
    slug: selectedProductSlug,
  });
  const selectedVariant = detailQuery.data?.variants.find(
    (variant) => variant.sku === selectedVariantSku,
  );
  const balanceQueryInput =
    selectedVariantSku && locationSlug
      ? buildStockCountBalanceLookupQuery({
          locationSlug,
          sku: selectedVariantSku,
        })
      : null;
  const balanceQuery = useQuery({
    enabled: !!balanceQueryInput,
    queryFn: () => {
      if (!balanceQueryInput) {
        throw new Error("Stock balance lookup requires a selected SKU.");
      }
      return fetchStockBalances(balanceQueryInput);
    },
    queryKey: stockBalancesQueryKey(balanceQueryInput ?? {}),
    staleTime: 10_000,
  });
  const selectedBalance = findStockCountBalance({
    balances: balanceQuery.data?.items ?? [],
    sku: selectedVariantSku,
  });
  const initialTarget = buildStockCountInitialTarget({
    balance: selectedBalance,
    product: selectedProduct,
    variant: selectedVariant,
  });

  return (
    <Card className="rounded-lg border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/50">
        <CardTitle>Stock count workspace</CardTitle>
        <CardDescription>
          Search the active catalog in small pages. Select a product and SKU,
          then record the physical count for {locationName || "this location"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="flex min-w-0 flex-col gap-3">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setActiveSearch(draftSearch);
              setProductPage(1);
              setSelectedProductSlug("");
              setSelectedVariantSku("");
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search product, SKU, or barcode"
                className="pl-9"
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Search product, SKU, or barcode"
                value={draftSearch}
              />
            </div>
            <Button size="sm" type="submit">
              Search
            </Button>
          </form>

          <ProductSearchResults
            activeSearch={activeSearch.trim()}
            canLoadMore={
              (productsQuery.data?.items.length ?? 0) <
              (productsQuery.data?.totalCount ?? 0)
            }
            isError={productsQuery.isError}
            isLoadingMore={productsQuery.isFetching && !!productsQuery.data}
            isPending={productsQuery.isPending && !productsQuery.data}
            onLoadMore={() => setProductPage((page) => page + 1)}
            onRetry={() => void productsQuery.refetch()}
            onSelect={(product) => {
              setSelectedProductSlug(product.slug);
              setSelectedVariantSku("");
            }}
            products={productsQuery.data?.items ?? []}
            selectedProductSlug={selectedProductSlug}
            totalCount={productsQuery.data?.totalCount ?? 0}
          />
        </div>

        <div className="min-w-0 rounded-lg border border-border/50 bg-muted/20 p-3">
          <SelectedProductPanel
            balanceError={balanceQuery.error}
            balanceLoading={balanceQuery.isFetching}
            detailQuery={detailQuery}
            error={error}
            initialTarget={initialTarget}
            isPending={isPending}
            locationSlug={locationSlug}
            onSelectVariant={setSelectedVariantSku}
            onRetryBalance={() => void balanceQuery.refetch()}
            onSubmit={onSubmit}
            selectedProductSlug={selectedProductSlug}
            selectedBalance={selectedBalance}
            selectedVariantSku={selectedVariantSku}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function getVisibleProducts(
  products: ReadonlyArray<AdminProductSummary>,
): ReadonlyArray<AdminProductSummary> {
  return products;
}
