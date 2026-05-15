import type { AdminOpeningVariantSearchQuery } from "@shop/contracts";
import {
  fetchAdminOpeningVariants,
  fetchManagerOpeningVariants,
} from "@/lib/react-query/catalog-variants";

export type OpeningStockLookup =
  | {
      locationSlug: string;
      type: "admin";
    }
  | {
      locationId: string;
      type: "manager";
    };

type ManagerOpeningVariantQuery = {
  locationId: string;
  page: number;
  pageSize: number;
  q: string;
};

export type OpeningVariantQuery =
  | AdminOpeningVariantSearchQuery
  | ManagerOpeningVariantQuery;

export function buildOpeningVariantQuery(
  lookup: OpeningStockLookup,
  q: string,
): OpeningVariantQuery {
  if (lookup.type === "admin") {
    return {
      locationSlug: lookup.locationSlug,
      page: 1,
      pageSize: 100,
      q,
    };
  }

  return {
    locationId: lookup.locationId,
    page: 1,
    pageSize: 50,
    q,
  };
}

export function fetchOpeningStockProducts(input: OpeningVariantQuery) {
  if ("locationSlug" in input) {
    return fetchAdminOpeningVariants(input);
  }

  return fetchManagerOpeningVariants(input);
}
