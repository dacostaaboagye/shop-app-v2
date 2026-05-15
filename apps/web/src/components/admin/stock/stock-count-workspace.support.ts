import type {
  AdminProductDetail,
  AdminProductListQuery,
  AdminProductSummary,
  AdminStockBalanceListQuery,
  AdminStockBalanceSummary,
  AdminVariantSummary,
} from "@shop/contracts";
import type { StockCountInitialTarget } from "./stock-count-form.support";

export const STOCK_COUNT_PRODUCT_PAGE_SIZE = 20;
export const STOCK_COUNT_BALANCE_LOOKUP_PAGE_SIZE = 100;

export function buildStockCountProductQuery(input: {
  page: number;
  search: string;
}): AdminProductListQuery {
  return {
    brandSlug: "",
    categorySlug: "",
    dir: "asc",
    page: 1,
    pageSize: STOCK_COUNT_PRODUCT_PAGE_SIZE * input.page,
    q: input.search.trim(),
    sort: "name",
    status: "active",
  };
}

export function buildStockCountBalanceLookupQuery(input: {
  locationSlug: string;
  sku: string;
}): AdminStockBalanceListQuery {
  return {
    brandSlug: "",
    categorySlug: "",
    locationSlug: input.locationSlug,
    page: 1,
    pageSize: STOCK_COUNT_BALANCE_LOOKUP_PAGE_SIZE,
    q: input.sku,
  };
}

export function getSelectedStockCountProduct(input: {
  detail: AdminProductDetail | undefined;
  products: ReadonlyArray<AdminProductSummary>;
  slug: string;
}): AdminProductDetail | AdminProductSummary | undefined {
  if (!input.slug) return undefined;
  return (
    input.detail ??
    input.products.find((product) => product.slug === input.slug)
  );
}

export function getActiveStockCountVariants(
  variants: ReadonlyArray<AdminVariantSummary>,
) {
  return variants.filter((variant) => variant.status === "active");
}

export function findStockCountBalance(input: {
  balances: ReadonlyArray<AdminStockBalanceSummary>;
  sku: string;
}): AdminStockBalanceSummary | null {
  return input.balances.find((item) => item.sku === input.sku) ?? null;
}

export function buildStockCountInitialTarget(input: {
  balance: AdminStockBalanceSummary | null;
  product: Pick<AdminProductSummary, "name"> | undefined;
  variant: AdminVariantSummary | undefined;
}): StockCountInitialTarget | null {
  if (!input.product || !input.variant) return null;

  return {
    onHandQuantity: input.balance?.onHandQuantity ?? 0,
    productName: input.product.name,
    reservedQuantity: input.balance?.reservedQuantity ?? 0,
    sku: input.variant.sku,
    variantName: input.variant.name,
  };
}
