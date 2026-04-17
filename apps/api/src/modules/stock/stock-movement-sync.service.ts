import {
  InvalidStockBalanceInputError,
  StockBalanceAdjustmentConflictError,
  StockBalanceNotFoundError,
  StockMovementSyncConflictError,
  type StockMovementSyncRepository,
  type SyncStockMovementResult,
} from "./stock-movement-sync.contracts.js";

export class StockMovementSyncService {
  constructor(private readonly repository: StockMovementSyncRepository) {}

  async syncMovement(input: {
    createdBy?: string;
    locationId: string;
    movementType:
      | "sale"
      | "delivery_receipt"
      | "delivery_dispatch"
      | "transfer_in"
      | "transfer_out"
      | "manual_adjustment";
    now?: Date;
    occurredAt: Date;
    quantityDelta: number;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<SyncStockMovementResult> {
    assertQuantityDelta(input.quantityDelta);

    return this.repository.withTransaction(async (transaction) => {
      const existingMovement = await transaction.findMovementBySource({
        locationId: input.locationId,
        skuId: input.skuId,
        sourceKey: input.sourceKey,
        sourceType: input.sourceType,
      });

      if (existingMovement) {
        if (!isEquivalentMovement(existingMovement, input)) {
          throw new StockMovementSyncConflictError({
            existingMovementId: existingMovement.id,
            locationId: input.locationId,
            skuId: input.skuId,
            sourceKey: input.sourceKey,
            sourceType: input.sourceType,
          });
        }

        return {
          movement: existingMovement,
          status: "noop",
        };
      }

      const now = input.now ?? new Date();
      const balance = await transaction.getBalanceForUpdate({
        locationId: input.locationId,
        skuId: input.skuId,
      });

      if (!balance) {
        if (input.quantityDelta < 0) {
          throw new StockBalanceNotFoundError({
            locationId: input.locationId,
            skuId: input.skuId,
          });
        }

        await transaction.insertBalance({
          createdAt: now,
          locationId: input.locationId,
          onHandQuantity: input.quantityDelta,
          skuId: input.skuId,
          ...(input.createdBy ? { updatedBy: input.createdBy } : {}),
        });
      } else {
        const nextOnHandQuantity = balance.onHandQuantity + input.quantityDelta;

        if (nextOnHandQuantity < balance.reservedQuantity) {
          throw new StockBalanceAdjustmentConflictError({
            locationId: input.locationId,
            nextOnHandQuantity,
            quantityDelta: input.quantityDelta,
            reservedQuantity: balance.reservedQuantity,
            skuId: input.skuId,
          });
        }

        await transaction.updateOnHandQuantity({
          locationId: input.locationId,
          onHandQuantity: nextOnHandQuantity,
          skuId: input.skuId,
          updatedAt: now,
          ...(input.createdBy ? { updatedBy: input.createdBy } : {}),
        });
      }

      return {
        movement: await transaction.insertMovement({
          createdAt: now,
          ...(input.createdBy ? { createdBy: input.createdBy } : {}),
          locationId: input.locationId,
          movementType: input.movementType,
          occurredAt: input.occurredAt,
          quantityDelta: input.quantityDelta,
          skuId: input.skuId,
          sourceKey: input.sourceKey,
          sourceType: input.sourceType,
        }),
        status: "created",
      };
    });
  }
}

function assertQuantityDelta(quantityDelta: number): void {
  if (quantityDelta === 0) {
    throw new InvalidStockBalanceInputError(
      "Stock movement quantity delta must not be zero.",
      { quantityDelta },
    );
  }
}

function isEquivalentMovement(
  existingMovement: {
    movementType: string;
    occurredAt: Date;
    quantityDelta: number;
  },
  input: {
    movementType: string;
    occurredAt: Date;
    quantityDelta: number;
  },
): boolean {
  return (
    existingMovement.movementType === input.movementType &&
    existingMovement.quantityDelta === input.quantityDelta &&
    existingMovement.occurredAt.getTime() === input.occurredAt.getTime()
  );
}
