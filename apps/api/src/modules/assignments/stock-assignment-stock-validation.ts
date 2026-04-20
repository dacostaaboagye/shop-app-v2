import { AppError } from "../_core/errors/app-error.js";
import type { StockAssignmentRouteDependencies } from "./stock-assignment-route-support.js";

export async function assertBatchStockAvailable(
  dependencies: StockAssignmentRouteDependencies,
  body: { items: { quantity: number; skuId: string }[]; locationId: string },
) {
  for (const item of body.items) {
    const onHand = await dependencies.stockBalanceRepository.getOnHandQuantity(
      item.skuId,
      body.locationId,
    );
    if (onHand === null || onHand === 0) {
      throw new AppError({
        code: "validation_error",
        detail: `SKU ${item.skuId} has no stock at this location and cannot be assigned.`,
        statusCode: 400,
        title: "No stock at location",
      });
    }
    if (item.quantity > onHand) {
      throw new AppError({
        code: "conflict",
        detail: `Requested quantity ${item.quantity} exceeds the ${onHand} units available at this location.`,
        details: {
          onHandQuantity: onHand,
          requestedQuantity: item.quantity,
          skuId: item.skuId,
        },
        statusCode: 409,
        title: "Quantity exceeds stock",
      });
    }
  }
}
