import { AppError } from "../_core/errors/app-error.js";
import type { StockSupplyRouteDependencies } from "./supply-request-route-support.js";

export async function assertValidRequestLocations(
  sourceLocationId: string,
  destinationLocationId: string,
) {
  if (sourceLocationId === destinationLocationId) {
    throw new AppError({
      code: "validation_error",
      detail: "Source and destination locations must be different.",
      statusCode: 400,
      title: "Invalid locations",
    });
  }
}

export async function loadVariantSnapshots(
  skuIds: string[],
  dependencies: StockSupplyRouteDependencies,
) {
  const snapshots = new Map<
    string,
    { productName: string; sku: string; variantName: string }
  >();

  for (const skuId of skuIds) {
    const snapshot =
      await dependencies.variantSnapshotRepository.getVariantSnapshot(skuId);
    if (!snapshot) {
      throw new AppError({
        code: "not_found",
        detail: `SKU ${skuId} does not exist or is not active.`,
        statusCode: 404,
        title: "SKU not found",
      });
    }
    snapshots.set(skuId, snapshot);
  }

  return snapshots;
}
