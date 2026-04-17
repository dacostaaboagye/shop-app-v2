import {
  type AdjustStockBalanceResult,
  type InitializeStockBalanceResult,
  InvalidStockBalanceInputError,
  StockBalanceAdjustmentConflictError,
  type StockBalanceAdjustmentRepository,
  StockBalanceAlreadyInitializedError,
  StockBalanceNotFoundError,
} from "./stock-balance-adjustment.contracts.js";

export class StockBalanceAdjustmentService {
  constructor(private readonly repository: StockBalanceAdjustmentRepository) {}

  async initializeBalance(input: {
    locationId: string;
    now?: Date;
    openingQuantity: number;
    skuId: string;
    updatedBy?: string;
  }): Promise<InitializeStockBalanceResult> {
    assertOpeningQuantity(input.openingQuantity);

    return this.repository.withTransaction(async (transaction) => {
      const existingBalance = await transaction.getBalanceForUpdate({
        locationId: input.locationId,
        skuId: input.skuId,
      });

      if (!existingBalance) {
        return {
          balance: await transaction.insertBalance({
            createdAt: input.now ?? new Date(),
            locationId: input.locationId,
            onHandQuantity: input.openingQuantity,
            skuId: input.skuId,
            ...(input.updatedBy ? { updatedBy: input.updatedBy } : {}),
          }),
          status: "created",
        };
      }

      if (
        existingBalance.onHandQuantity === input.openingQuantity &&
        existingBalance.reservedQuantity === 0
      ) {
        return {
          balance: existingBalance,
          status: "noop",
        };
      }

      throw new StockBalanceAlreadyInitializedError({
        currentOnHandQuantity: existingBalance.onHandQuantity,
        currentReservedQuantity: existingBalance.reservedQuantity,
        locationId: input.locationId,
        skuId: input.skuId,
      });
    });
  }

  async adjustOnHandQuantity(input: {
    locationId: string;
    now?: Date;
    quantityDelta: number;
    skuId: string;
    updatedBy?: string;
  }): Promise<AdjustStockBalanceResult> {
    assertQuantityDelta(input.quantityDelta);

    return this.repository.withTransaction(async (transaction) => {
      const existingBalance = await transaction.getBalanceForUpdate({
        locationId: input.locationId,
        skuId: input.skuId,
      });

      if (!existingBalance) {
        throw new StockBalanceNotFoundError({
          locationId: input.locationId,
          skuId: input.skuId,
        });
      }

      const nextOnHandQuantity =
        existingBalance.onHandQuantity + input.quantityDelta;

      if (nextOnHandQuantity < existingBalance.reservedQuantity) {
        throw new StockBalanceAdjustmentConflictError({
          locationId: input.locationId,
          nextOnHandQuantity,
          quantityDelta: input.quantityDelta,
          reservedQuantity: existingBalance.reservedQuantity,
          skuId: input.skuId,
        });
      }

      return {
        balance: await transaction.updateOnHandQuantity({
          locationId: input.locationId,
          onHandQuantity: nextOnHandQuantity,
          skuId: input.skuId,
          updatedAt: input.now ?? new Date(),
          ...(input.updatedBy ? { updatedBy: input.updatedBy } : {}),
        }),
        previousOnHandQuantity: existingBalance.onHandQuantity,
        status: "adjusted",
      };
    });
  }
}

function assertOpeningQuantity(openingQuantity: number): void {
  if (openingQuantity < 0) {
    throw new InvalidStockBalanceInputError(
      "Opening stock quantity must be zero or greater.",
      { openingQuantity },
    );
  }
}

function assertQuantityDelta(quantityDelta: number): void {
  if (quantityDelta === 0) {
    throw new InvalidStockBalanceInputError(
      "Stock adjustment delta must not be zero.",
      { quantityDelta },
    );
  }
}
