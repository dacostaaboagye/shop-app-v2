import type { AdminOpeningStockRequest } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

type OpeningStockLine = AdminOpeningStockRequest["lines"][number];

type OpeningStockVariant = {
  id: string;
  product: unknown | null;
  sku: string;
};

export function assertOpeningStockLinesReady(input: {
  existingBalanceSkuIds: ReadonlySet<string>;
  existingInitializationSkuIds: ReadonlySet<string>;
  lines: ReadonlyArray<OpeningStockLine>;
  variantBySku: ReadonlyMap<string, OpeningStockVariant>;
}) {
  const problems = input.lines.flatMap((line, index) => {
    const variant = input.variantBySku.get(line.sku);
    if (!variant || !variant.product) {
      return [
        {
          index,
          message: `SKU "${line.sku}" was not found or is not active.`,
          reason: "unknown_sku",
          sku: line.sku,
        },
      ];
    }

    if (
      input.existingBalanceSkuIds.has(variant.id) ||
      input.existingInitializationSkuIds.has(variant.id)
    ) {
      return [
        {
          index,
          message: `SKU "${line.sku}" already has opening stock at this location.`,
          reason: "already_initialized",
          sku: line.sku,
        },
      ];
    }

    return [];
  });

  if (problems.length === 0) return;

  throw new AppError({
    code: "conflict",
    detail:
      "Opening stock can only initialize SKU/location pairs with no existing stock balance.",
    details: { lines: problems },
    statusCode: 409,
    title: "Opening stock has blocked rows",
  });
}

export function isOpeningStockUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; constraint?: unknown };
  if (record.code !== "23505") return false;
  return (
    record.constraint === "stock_balance_initializations_sku_location_unique" ||
    record.constraint === "stock_balances_sku_location_unique"
  );
}
