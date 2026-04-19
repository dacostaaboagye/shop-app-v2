import type { VariantSearchResponse } from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export type VariantSearchParams = {
  locationId: string;
  page?: number;
  pageSize?: number;
  q?: string;
};

export const variantSearchQueryKey = (params: VariantSearchParams) =>
  ["catalog", "variants", "search", params] as const;

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
