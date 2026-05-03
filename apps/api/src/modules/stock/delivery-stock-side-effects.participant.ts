import type { DeliverySourceType } from "@shop/contracts";
import type {
  DeliveryCreationStockSideEffectsInput,
  DeliveryCreationStockSideEffectsPort,
  DeliveryCreationStockSideEffectsResult,
} from "../deliveries/delivery-creation.contracts.js";
import { createPostgresStockReservationTransaction } from "./postgres-reservation-lifecycle.repository.js";
import { createPostgresStockMovementSyncTransaction } from "./postgres-stock-movement-sync-transaction.js";
import {
  InsufficientStockError,
  type StockReservationTransaction,
} from "./reservation-lifecycle.contracts.js";
import { createReservationInTransaction } from "./reservation-lifecycle.service.js";
import type { StockMovementSyncRepository } from "./stock-movement-sync.contracts.js";
import {
  StockBalanceAdjustmentConflictError,
  StockBalanceNotFoundError,
} from "./stock-movement-sync.contracts.js";
import { StockMovementSyncService } from "./stock-movement-sync.service.js";

export class PostgresDeliveryStockSideEffectsParticipant
  implements DeliveryCreationStockSideEffectsPort
{
  async applyWithinTransaction(
    input: DeliveryCreationStockSideEffectsInput,
  ): Promise<DeliveryCreationStockSideEffectsResult> {
    const movementSyncService = new StockMovementSyncService({
      async withTransaction(callback) {
        return callback(createPostgresStockMovementSyncTransaction(input.tx));
      },
    });

    return applyDeliveryStockSideEffectsInStockTransaction(
      createPostgresStockReservationTransaction(input.tx),
      movementSyncService,
      input,
    );
  }
}

export async function applyDeliveryStockSideEffectsInStockTransaction(
  transaction: StockReservationTransaction,
  movementSyncService: Pick<StockMovementSyncService, "syncMovement">,
  input: Omit<DeliveryCreationStockSideEffectsInput, "tx">,
): Promise<DeliveryCreationStockSideEffectsResult> {
  if (input.sourceType === "pos_sale") {
    return { status: "ok" };
  }

  for (const item of input.items) {
    const result =
      input.sourceType === "transfer"
        ? await syncTransferMovement(movementSyncService, input, item)
        : await reserveOriginStock(transaction, input, item);
    if (result.status === "insufficient_stock") {
      return result;
    }
  }

  if (input.sourceType === "transfer") {
    await recordTransferInTransitEvidence(transaction, input);
  }

  return { status: "ok" };
}

export function createSingleTransactionMovementSyncService(
  transaction: ReturnType<typeof createPostgresStockMovementSyncTransaction>,
): StockMovementSyncService {
  const repository: StockMovementSyncRepository = {
    async withTransaction(callback) {
      return callback(transaction);
    },
  };
  return new StockMovementSyncService(repository);
}

async function reserveOriginStock(
  transaction: StockReservationTransaction,
  input: Omit<DeliveryCreationStockSideEffectsInput, "tx">,
  item: Omit<DeliveryCreationStockSideEffectsInput, "tx">["items"][number],
): Promise<DeliveryCreationStockSideEffectsResult> {
  try {
    await createReservationInTransaction(transaction, {
      createdBy: input.createdBy,
      locationId: input.originLocationId,
      now: input.now,
      quantity: item.quantity,
      skuId: item.skuId,
      sourceKey: item.itemReference,
      sourceType: deliveryReservationSourceType(input.sourceType),
      ttlMinutes: null,
    });

    return { status: "ok" };
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return {
        status: "insufficient_stock",
        shortfalls: [
          {
            available: getNumericDetail(error, "availableQuantity"),
            requested: item.quantity,
            skuId: item.skuId,
          },
        ],
      };
    }
    throw error;
  }
}

async function syncTransferMovement(
  movementSyncService: Pick<StockMovementSyncService, "syncMovement">,
  input: Omit<DeliveryCreationStockSideEffectsInput, "tx">,
  item: Omit<DeliveryCreationStockSideEffectsInput, "tx">["items"][number],
): Promise<DeliveryCreationStockSideEffectsResult> {
  try {
    await movementSyncService.syncMovement({
      createdBy: input.createdBy,
      locationId: input.originLocationId,
      movementType: "transfer_out",
      now: input.now,
      occurredAt: input.now,
      quantityDelta: -item.quantity,
      skuId: item.skuId,
      sourceKey: item.itemReference,
      sourceType: "delivery_transfer",
    });
    return { status: "ok" };
  } catch (error) {
    if (
      error instanceof StockBalanceAdjustmentConflictError ||
      error instanceof StockBalanceNotFoundError
    ) {
      return {
        status: "insufficient_stock",
        shortfalls: [
          {
            available: getTransferAvailableQuantity(error, item.quantity),
            requested: item.quantity,
            skuId: item.skuId,
          },
        ],
      };
    }
    throw error;
  }
}

async function recordTransferInTransitEvidence(
  transaction: StockReservationTransaction,
  input: Omit<DeliveryCreationStockSideEffectsInput, "tx">,
): Promise<void> {
  const item = input.items[0];
  const transferContext = input.transferContext;
  if (!item || input.items.length !== 1 || !transferContext) {
    throw new Error(
      "Transfer delivery stock side effects require one item and transfer context.",
    );
  }

  await transaction.recordGoodsTransferNote({
    createdAt: input.now,
    destinationLocationId: transferContext.destinationLocationId,
    dispatchedAt: input.now,
    dispatchedBy: input.createdBy,
    notes: null,
    quantity: item.quantity,
    reference: input.sourceReference,
    skuId: item.skuId,
    skuSnapshot: transferContext.skuSnapshot,
    sourceLocationId: input.originLocationId,
    status: "dispatched",
    supplyRequestId: transferContext.supplyRequestId,
    updatedAt: input.now,
  });
}

function deliveryReservationSourceType(sourceType: DeliverySourceType): string {
  return `delivery_${sourceType}`;
}

function getNumericDetail(error: InsufficientStockError, key: string): number {
  const value = error.details?.[key];
  return typeof value === "number" ? value : 0;
}

function getTransferAvailableQuantity(error: AppErrorLike, requested: number) {
  const nextOnHandQuantity = error.details?.nextOnHandQuantity;
  if (typeof nextOnHandQuantity === "number") {
    return nextOnHandQuantity + requested;
  }
  return 0;
}

type AppErrorLike = {
  details?: Record<string, unknown> | undefined;
};
