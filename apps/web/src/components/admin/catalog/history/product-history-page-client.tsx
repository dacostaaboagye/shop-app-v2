"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppEmptyState } from "@/components/system/app-empty-state";
import {
  adminProductQueryKey,
  fetchAdminProduct,
} from "@/lib/react-query/admin-catalog-products";
import { toRoute } from "@/lib/routes";
import {
  CatalogDetailError,
  CatalogDetailSkeleton,
} from "../catalog-detail-surfaces";
import { CatalogHistoryList } from "./catalog-history-list";
import {
  buildProductHistoryPageProps,
  NO_HISTORY_ACCESS_DESCRIPTION,
} from "./catalog-history-page.support";
import { CatalogHistoryPageView } from "./catalog-history-page-view";

export function ProductHistoryPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
  const productQuery = useQuery({
    queryFn: () => fetchAdminProduct(slug),
    queryKey: adminProductQueryKey(slug),
  });

  if (!can("catalog.history.view")) {
    return (
      <CatalogHistoryPageView
        backHref={toRoute(`/admin/products/${slug}`)}
        backLabel="Back to product"
        description="You do not have permission to view change history for this product."
        title="Change history"
      >
        <AppEmptyState
          description={NO_HISTORY_ACCESS_DESCRIPTION}
          title="No access"
        />
      </CatalogHistoryPageView>
    );
  }

  if (productQuery.isPending && !productQuery.data) {
    return <CatalogDetailSkeleton />;
  }

  if (productQuery.isError) {
    return (
      <CatalogDetailError
        message={
          productQuery.error instanceof Error
            ? productQuery.error.message
            : "An unexpected error occurred."
        }
        title="Unable to load product"
      />
    );
  }

  const product = productQuery.data ?? null;
  const viewProps = buildProductHistoryPageProps(product, slug);

  if (!product) {
    return (
      <CatalogHistoryPageView {...viewProps}>
        <AppEmptyState
          description="The product may have been removed, or the link is incorrect."
          title="Product not found"
        />
      </CatalogHistoryPageView>
    );
  }

  return (
    <CatalogHistoryPageView {...viewProps}>
      <CatalogHistoryList entityKind="product" slug={product.slug} />
    </CatalogHistoryPageView>
  );
}
