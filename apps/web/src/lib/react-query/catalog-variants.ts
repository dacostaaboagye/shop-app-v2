import type {
  AdminOpeningVariantSearchQuery,
  VariantSearchResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export type VariantSearchParams = {
  locationId: string;
  page?: number;
  pageSize?: number;
  q?: string;
};

export const variantSearchQueryKey = (params: VariantSearchParams) =>
  ["catalog", "variants", "search", params] as const;

export const openingVariantSearchQueryKey = (
  params: VariantSearchParams | AdminOpeningVariantSearchQuery,
) => ["catalog", "variants", "opening", params] as const;

export async function fetchManagerVariants(
  params: VariantSearchParams,
): Promise<VariantSearchResponse> {
  const query = new URLSearchParams({
    locationId: params.locationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
    q: params.q ?? "",
  });
  return fetchJson<VariantSearchResponse>(
    `/api/manager/catalog/variants?${query.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminOpeningVariants(
  params: AdminOpeningVariantSearchQuery,
): Promise<VariantSearchResponse> {
  const query = new URLSearchParams({
    locationSlug: params.locationSlug,
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q,
  });
  return fetchJson<VariantSearchResponse>(
    `/api/admin/catalog/variants/opening?${query.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchManagerOpeningVariants(
  params: Required<VariantSearchParams>,
): Promise<VariantSearchResponse> {
  const query = new URLSearchParams({
    locationId: params.locationId,
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q,
  });
  return fetchJson<VariantSearchResponse>(
    `/api/manager/catalog/variants/opening?${query.toString()}`,
    undefined,
    { auth: "required" },
  );
}
