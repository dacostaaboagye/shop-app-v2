import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertPositiveIntegerSourceQuantities } from "../src/modules/deliveries/delivery-creation.support.js";
import { DeliveryInvalidSourceQuantityError } from "../src/modules/deliveries/delivery-errors.js";
import { applyDeliveryStockSideEffectsInStockTransaction } from "../src/modules/stock/delivery-stock-side-effects.participant.js";
import type {
  StockReservationRecord,
  StockReservationTransaction,
} from "../src/modules/stock/reservation-lifecycle.contracts.js";
import type {
  StockMovementRecord,
  SyncStockMovementResult,
} from "../src/modules/stock/stock-movement-sync.contracts.js";
import { StockBalanceAdjustmentConflictError } from "../src/modules/stock/stock-movement-sync.contracts.js";

describe("delivery creation stock side effects", () => {
  it("validates source item quantities as positive integers", () => {
    for (const quantity of [0, -1, 1.5]) {
      assert.throws(
        () =>
          assertPositiveIntegerSourceQuantities({
            items: [
              { skuId: "00000000-0000-4000-8000-000000000020", quantity },
            ],
            sourceReference: "WEB-20260501-0001",
            sourceType: "online_order",
          }),
        DeliveryInvalidSourceQuantityError,
      );
    }
  });

  it("does not create stock reservations for POS deliveries", async () => {
    const stockTx = new FakeStockReservationTransaction({ onHandQuantity: 1 });
    const result = await applyStockSideEffects(
      stockTx,
      stockInput("pos_sale", 1),
    );
    assert.deepEqual(result, { status: "ok" });
    assert.equal(stockTx.reservations.length, 0);
  });

  it("reserves online order stock at the origin location", async () => {
    const stockTx = new FakeStockReservationTransaction({ onHandQuantity: 5 });
    const result = await applyStockSideEffects(
      stockTx,
      stockInput("online_order", 2),
    );
    assert.deepEqual(result, { status: "ok" });
    assert.equal(stockTx.reservations.length, 1);
    assert.equal(stockTx.reservations[0]?.sourceType, "delivery_online_order");
    assert.equal(stockTx.reservations[0]?.sourceKey, "DLI-0001");
    assert.equal(stockTx.reservedQuantity, 2);
  });

  it("returns transfer stock shortfalls for delivery error mapping", async () => {
    const stockTx = new FakeStockReservationTransaction({ onHandQuantity: 1 });
    const result = await applyStockSideEffects(
      stockTx,
      stockInput("transfer", 2),
    );
    assert.deepEqual(result, {
      status: "insufficient_stock",
      shortfalls: [
        {
          available: 1,
          requested: 2,
          skuId: "00000000-0000-4000-8000-000000000020",
        },
      ],
    });
  });

  it("syncs transfer-out stock movement and records in-transit evidence", async () => {
    const stockTx = new FakeStockReservationTransaction({ onHandQuantity: 5 });
    const movementSyncService = new FakeMovementSyncService(stockTx);
    const result = await applyDeliveryStockSideEffectsInStockTransaction(
      stockTx,
      movementSyncService,
      transferStockInput(2),
    );
    assert.deepEqual(result, { status: "ok" });
    assert.equal(stockTx.reservations.length, 0);
    assert.equal(stockTx.onHandQuantity, 3);
    assert.equal(stockTx.reservedQuantity, 0);
    assert.deepEqual(stockTx.movements, [
      {
        movementType: "transfer_out",
        quantityDelta: -2,
        skuId: "00000000-0000-4000-8000-000000000020",
        sourceKey: "DLI-0001",
        sourceType: "delivery_transfer",
      },
    ]);
    assert.deepEqual(stockTx.goodsTransferNotes, [
      {
        destinationLocationId: "00000000-0000-4000-8000-000000000011",
        quantity: 2,
        reference: "TRF-0001",
        skuId: "00000000-0000-4000-8000-000000000020",
        sourceLocationId: "00000000-0000-4000-8000-000000000010",
        supplyRequestId: "00000000-0000-4000-8000-000000000030",
      },
    ]);
  });
});
function applyStockSideEffects(
  stockTx: FakeStockReservationTransaction,
  input: Parameters<typeof applyDeliveryStockSideEffectsInStockTransaction>[2],
) {
  return applyDeliveryStockSideEffectsInStockTransaction(
    stockTx,
    new FakeMovementSyncService(stockTx),
    input,
  );
}
function stockInput(
  sourceType: "online_order" | "pos_sale" | "transfer",
  quantity: number,
) {
  return {
    createdBy: "00000000-0000-4000-8000-000000000001",
    items: [
      {
        itemReference: "DLI-0001",
        quantity,
        skuId: "00000000-0000-4000-8000-000000000020",
      },
    ],
    now: new Date("2026-05-01T00:00:00.000Z"),
    originLocationId: "00000000-0000-4000-8000-000000000010",
    sourceReference: sourceType === "transfer" ? "TRF-0001" : "SRC-0001",
    sourceType,
  };
}
function transferStockInput(quantity: number) {
  return {
    ...stockInput("transfer", quantity),
    transferContext: {
      destinationLocationId: "00000000-0000-4000-8000-000000000011",
      skuSnapshot: {
        sku: "SKU-1",
        productName: "Product",
        variantName: "Variant",
      },
      supplyRequestId: "00000000-0000-4000-8000-000000000030",
    },
  };
}
class FakeStockReservationTransaction implements StockReservationTransaction {
  readonly goodsTransferNotes: Array<{
    destinationLocationId: string;
    quantity: number;
    reference: string;
    skuId: string;
    sourceLocationId: string;
    supplyRequestId: string;
  }> = [];
  readonly movements: Array<{
    movementType: string;
    quantityDelta: number;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }> = [];
  readonly reservations: StockReservationRecord[] = [];
  onHandQuantity: number;
  reservedQuantity: number;
  constructor(input: { onHandQuantity: number; reservedQuantity?: number }) {
    this.onHandQuantity = input.onHandQuantity;
    this.reservedQuantity = input.reservedQuantity ?? 0;
  }
  async adjustStockBalance(input: {
    onHandDelta?: number;
    reservedDelta?: number;
  }) {
    this.onHandQuantity += input.onHandDelta ?? 0;
    this.reservedQuantity += input.reservedDelta ?? 0;
    return true;
  }

  async findActiveReservationBySource(input: {
    locationId: string;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }) {
    return (
      this.reservations.find(
        (reservation) =>
          reservation.locationId === input.locationId &&
          reservation.skuId === input.skuId &&
          reservation.sourceKey === input.sourceKey &&
          reservation.sourceType === input.sourceType &&
          reservation.status === "active",
      ) ?? null
    );
  }

  async getReservationForUpdate(reservationId: string) {
    return (
      this.reservations.find(
        (reservation) => reservation.id === reservationId,
      ) ?? null
    );
  }

  async getStockAvailabilitySnapshot() {
    return {
      activeReservationQuantity: this.reservedQuantity,
      onHandQuantity: this.onHandQuantity,
      reservedQuantity: this.reservedQuantity,
    };
  }

  async insertReservation(input: {
    createdAt: Date;
    createdBy?: string | null;
    expiresAt: Date | null;
    locationId: string;
    quantity: number;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }) {
    const reservation: StockReservationRecord = {
      id: `reservation-${this.reservations.length + 1}`,
      cancelledAt: null,
      confirmedAt: null,
      createdAt: input.createdAt,
      createdBy: input.createdBy ?? null,
      expiresAt: input.expiresAt,
      locationId: input.locationId,
      quantity: input.quantity,
      releasedAt: null,
      skuId: input.skuId,
      sourceKey: input.sourceKey,
      sourceType: input.sourceType,
      status: "active",
      updatedAt: input.createdAt,
    };
    this.reservations.push(reservation);
    return reservation;
  }

  async markReservationConfirmed(input: {
    confirmedAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord> {
    const reservation = this.reservations.find(
      (candidate) => candidate.id === input.reservationId,
    );
    if (!reservation) {
      throw new Error("reservation not found");
    }
    reservation.status = "confirmed";
    reservation.confirmedAt = input.confirmedAt;
    reservation.updatedAt = input.confirmedAt;
    return reservation;
  }

  async markReservationReleased(): Promise<StockReservationRecord> {
    throw new Error("release is not used by delivery creation.");
  }

  async recordGoodsTransferNote(input: {
    destinationLocationId: string;
    quantity: number;
    reference: string;
    skuId: string;
    sourceLocationId: string;
    supplyRequestId: string;
  }): Promise<void> {
    this.goodsTransferNotes.push({
      destinationLocationId: input.destinationLocationId,
      quantity: input.quantity,
      reference: input.reference,
      skuId: input.skuId,
      sourceLocationId: input.sourceLocationId,
      supplyRequestId: input.supplyRequestId,
    });
  }
}

class FakeMovementSyncService {
  constructor(private readonly stockTx: FakeStockReservationTransaction) {}

  async syncMovement(input: {
    createdBy?: string;
    locationId: string;
    movementType: string;
    now?: Date;
    occurredAt: Date;
    quantityDelta: number;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<SyncStockMovementResult> {
    if (this.stockTx.onHandQuantity + input.quantityDelta < 0) {
      throw new StockBalanceAdjustmentConflictError({
        locationId: "00000000-0000-4000-8000-000000000010",
        nextOnHandQuantity: this.stockTx.onHandQuantity + input.quantityDelta,
        quantityDelta: input.quantityDelta,
        reservedQuantity: this.stockTx.reservedQuantity,
        skuId: input.skuId,
      });
    }
    this.stockTx.onHandQuantity += input.quantityDelta;
    this.stockTx.movements.push({
      movementType: input.movementType,
      quantityDelta: input.quantityDelta,
      skuId: input.skuId,
      sourceKey: input.sourceKey,
      sourceType: input.sourceType,
    });
    return {
      movement: createMovement(input),
      status: "created" as const,
    };
  }
}

function createMovement(input: {
  createdBy?: string;
  locationId: string;
  movementType: string;
  now?: Date;
  occurredAt: Date;
  quantityDelta: number;
  skuId: string;
  sourceKey: string;
  sourceType: string;
}): StockMovementRecord {
  return {
    createdAt: input.now ?? input.occurredAt,
    createdBy: input.createdBy ?? null,
    id: "movement-1",
    locationId: input.locationId,
    movementType: input.movementType as StockMovementRecord["movementType"],
    occurredAt: input.occurredAt,
    quantityDelta: input.quantityDelta,
    skuId: input.skuId,
    sourceKey: input.sourceKey,
    sourceType: input.sourceType,
  };
}
