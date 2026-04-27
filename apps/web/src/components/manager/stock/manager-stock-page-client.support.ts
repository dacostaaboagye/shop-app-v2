import type { AdminStockBalanceSummary } from "@shop/contracts";
import type { SupplyRequestTarget } from "@/components/worker/stock/supply-request-dialog.types";

export function toSupplyRequestTarget(
  row: AdminStockBalanceSummary,
  destination: { locationId: string; locationName: string },
): SupplyRequestTarget {
  return {
    locationId: destination.locationId,
    locationName: destination.locationName,
    productName: row.productName,
    sku: row.sku,
    skuId: row.skuId,
    variantName: row.variantName,
  };
}
