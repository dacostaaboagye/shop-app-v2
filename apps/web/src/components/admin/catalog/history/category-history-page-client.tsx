"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppEmptyState } from "@/components/system/app-empty-state";
import {
  adminCategoryQueryKey,
  fetchAdminCategory,
} from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import {
  CatalogDetailError,
  CatalogDetailSkeleton,
} from "../catalog-detail-surfaces";
import { CatalogHistoryList } from "./catalog-history-list";
import {
  buildCategoryHistoryPageProps,
  NO_HISTORY_ACCESS_DESCRIPTION,
} from "./catalog-history-page.support";
import { CatalogHistoryPageView } from "./catalog-history-page-view";

export function CategoryHistoryPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
  const categoryQuery = useQuery({
    queryFn: () => fetchAdminCategory(slug),
    queryKey: adminCategoryQueryKey(slug),
  });

  if (!can("catalog.history.view")) {
    return (
      <CatalogHistoryPageView
        backHref={toRoute(`/admin/products/categories/${slug}`)}
        backLabel="Back to category"
        description="You do not have permission to view change history for this category."
        title="Change history"
      >
        <AppEmptyState
          description={NO_HISTORY_ACCESS_DESCRIPTION}
          title="No access"
        />
      </CatalogHistoryPageView>
    );
  }

  if (categoryQuery.isPending && !categoryQuery.data) {
    return <CatalogDetailSkeleton />;
  }

  if (categoryQuery.isError) {
    return (
      <CatalogDetailError
        message={
          categoryQuery.error instanceof Error
            ? categoryQuery.error.message
            : "An unexpected error occurred."
        }
        title="Unable to load category"
      />
    );
  }

  const category = categoryQuery.data ?? null;
  const viewProps = buildCategoryHistoryPageProps(category, slug);

  if (!category) {
    return (
      <CatalogHistoryPageView {...viewProps}>
        <AppEmptyState
          description="The category may have been removed, or the link is incorrect."
          title="Category not found"
        />
      </CatalogHistoryPageView>
    );
  }

  return (
    <CatalogHistoryPageView {...viewProps}>
      <CatalogHistoryList entityKind="category" slug={category.slug} />
    </CatalogHistoryPageView>
  );
}
