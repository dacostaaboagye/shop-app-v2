import { type ChangeLogPage, changeLogPageSchema } from "@shop/contracts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/react-query/fetch-json";

export type CatalogHistoryEntityKind =
  | "product"
  | "variant"
  | "brand"
  | "category";

export const DEFAULT_CHANGE_LOG_PAGE_SIZE = 20;

const ENTITY_PATHS: Record<CatalogHistoryEntityKind, string> = {
  product: "products",
  variant: "variants",
  brand: "brands",
  category: "categories",
};

type FetchCatalogChangeLogArgs = {
  entityKind: CatalogHistoryEntityKind;
  slug: string;
  cursor?: string | null;
  limit?: number;
};

export async function fetchCatalogChangeLog({
  entityKind,
  slug,
  cursor,
  limit = DEFAULT_CHANGE_LOG_PAGE_SIZE,
}: FetchCatalogChangeLogArgs): Promise<ChangeLogPage> {
  const params = new URLSearchParams();

  params.set("limit", String(limit));

  if (cursor) {
    params.set("cursor", cursor);
  }

  const segment = ENTITY_PATHS[entityKind];
  const url = `/api/admin/catalog/${segment}/${encodeURIComponent(slug)}/changes?${params.toString()}`;
  const payload = await fetchJson<unknown>(url, undefined, {
    auth: "required",
  });

  // Validate the response shape so a server contract drift fails loudly here
  // instead of producing render-time crashes inside individual entry cells.
  return changeLogPageSchema.parse(payload);
}

export function adminCatalogHistoryQueryKey(
  entityKind: CatalogHistoryEntityKind,
  slug: string,
) {
  return ["admin", "catalog", "history", entityKind, slug] as const;
}

type UseCatalogChangeLogArgs = {
  entityKind: CatalogHistoryEntityKind;
  slug: string;
  enabled?: boolean;
  pageSize?: number;
};

export function useCatalogChangeLog({
  entityKind,
  slug,
  enabled = true,
  pageSize = DEFAULT_CHANGE_LOG_PAGE_SIZE,
}: UseCatalogChangeLogArgs) {
  return useInfiniteQuery({
    enabled,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: ChangeLogPage) => lastPage.nextCursor,
    queryFn: ({ pageParam }) =>
      fetchCatalogChangeLog({
        cursor: pageParam,
        entityKind,
        limit: pageSize,
        slug,
      }),
    queryKey: adminCatalogHistoryQueryKey(entityKind, slug),
  });
}
