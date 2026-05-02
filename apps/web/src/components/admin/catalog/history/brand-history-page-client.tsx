"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppEmptyState } from "@/components/system/app-empty-state";
import {
  adminBrandQueryKey,
  fetchAdminBrand,
} from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import {
  CatalogDetailError,
  CatalogDetailSkeleton,
} from "../catalog-detail-surfaces";
import { CatalogHistoryList } from "./catalog-history-list";
import {
  buildBrandHistoryPageProps,
  NO_HISTORY_ACCESS_DESCRIPTION,
} from "./catalog-history-page.support";
import { CatalogHistoryPageView } from "./catalog-history-page-view";

export function BrandHistoryPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
  const brandQuery = useQuery({
    queryFn: () => fetchAdminBrand(slug),
    queryKey: adminBrandQueryKey(slug),
  });

  if (!can("catalog.history.view")) {
    return (
      <CatalogHistoryPageView
        backHref={toRoute(`/admin/products/brands/${slug}`)}
        backLabel="Back to brand"
        description="You do not have permission to view change history for this brand."
        title="Change history"
      >
        <AppEmptyState
          description={NO_HISTORY_ACCESS_DESCRIPTION}
          title="No access"
        />
      </CatalogHistoryPageView>
    );
  }

  if (brandQuery.isPending && !brandQuery.data) {
    return <CatalogDetailSkeleton />;
  }

  if (brandQuery.isError) {
    return (
      <CatalogDetailError
        message={
          brandQuery.error instanceof Error
            ? brandQuery.error.message
            : "An unexpected error occurred."
        }
        title="Unable to load brand"
      />
    );
  }

  const brand = brandQuery.data ?? null;
  const viewProps = buildBrandHistoryPageProps(brand, slug);

  if (!brand) {
    return (
      <CatalogHistoryPageView {...viewProps}>
        <AppEmptyState
          description="The brand may have been removed, or the link is incorrect."
          title="Brand not found"
        />
      </CatalogHistoryPageView>
    );
  }

  return (
    <CatalogHistoryPageView {...viewProps}>
      <CatalogHistoryList entityKind="brand" slug={brand.slug} />
    </CatalogHistoryPageView>
  );
}
