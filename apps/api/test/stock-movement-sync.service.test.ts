import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockBalanceRecord } from "../src/modules/stock/stock-balance-adjustment.contracts.js";
import {
  InvalidStockBalanceInputError,
  StockBalanceAdjustmentConflictError,
  StockBalanceNotFoundError,
  type StockMovementRecord,
  StockMovementSyncConflictError,
  type StockMovementSyncRepository,
  type StockMovementSyncTransaction,
} from "../src/modules/stock/stock-movement-sync.contracts.js";
import { StockMovementSyncService } from "../src/modules/stock/stock-movement-sync.service.js";

describe("StockMovementSyncService", () => {
  it("bootstraps a missing balance row from a positive inbound movement", async () => {
    const harness = createHarness();

    const result = await harness.service.syncMovement({
      locationId: "loc_store_1",
      movementType: "delivery_receipt",
      now: new Date("2026-04-08T12:05:00.000Z"),
      occurredAt: new Date("2026-04-08T12:00:00.000Z"),
      quantityDelta: 8,
      skuId: "sku_1",
      sourceKey: "delivery_item_1",
      sourceType: "delivery-item",
    });

    assert.equal(result.status, "created");
    assert.equal(harness.state.balance?.onHandQuantity, 8);
  });

  it("records supplier goods receipts as inbound stock movements", async () => {
    const harness = createHarness();

    const result = await harness.service.syncMovement({
      locationId: "loc_store_1",
      movementType: "goods_receipt",
      now: new Date("2026-05-13T12:00:00.000Z"),
      occurredAt: new Date("2026-05-13T12:00:00.000Z"),
      quantityDelta: 6,
      skuId: "sku_1",
      sourceKey: "PO-2026-0001:line-1:6",
      sourceType: "supplier_procurement_receipt",
    });

    assert.equal(result.status, "created");
    assert.equal(result.movement.movementType, "goods_receipt");
    assert.equal(harness.state.balance?.onHandQuantity, 6);
  });

  it("applies an outbound movement to an existing balance", async () => {
    const harness = createHarness({
      balance: createBalance({
        onHandQuantity: 10,
        reservedQuantity: 2,
      }),
    });

    const result = await harness.service.syncMovement({
      locationId: "loc_store_1",
      movementType: "sale",
      occurredAt: new Date("2026-04-08T12:00:00.000Z"),
      quantityDelta: -3,
      skuId: "sku_1",
      sourceKey: "order_line_1",
      sourceType: "sale-line",
    });

    assert.equal(result.status, "created");
    assert.equal(harness.state.balance?.onHandQuantity, 7);
  });

  it("returns a no-op for an identical duplicate movement", async () => {
    const existingMovement = createMovement({
      movementType: "sale",
      occurredAt: new Date("2026-04-08T12:00:00.000Z"),
      quantityDelta: -3,
      sourceKey: "order_line_1",
      sourceType: "sale-line",
    });
    const harness = createHarness({
      balance: createBalance({
        onHandQuantity: 7,
        reservedQuantity: 2,
      }),
      movements: [existingMovement],
    });

    const result = await harness.service.syncMovement({
      locationId: "loc_store_1",
      movementType: "sale",
      occurredAt: new Date("2026-04-08T12:00:00.000Z"),
      quantityDelta: -3,
      skuId: "sku_1",
      sourceKey: "order_line_1",
      sourceType: "sale-line",
    });

    assert.equal(result.status, "noop");
    assert.equal(result.movement.id, existingMovement.id);
    assert.equal(harness.state.balance?.onHandQuantity, 7);
  });

  it("rejects duplicate movement identities with different payloads", async () => {
    const harness = createHarness({
      movements: [
        createMovement({
          movementType: "sale",
          occurredAt: new Date("2026-04-08T12:00:00.000Z"),
          quantityDelta: -3,
          sourceKey: "order_line_1",
          sourceType: "sale-line",
        }),
      ],
    });

    await assert.rejects(
      () =>
        harness.service.syncMovement({
          locationId: "loc_store_1",
          movementType: "sale",
          occurredAt: new Date("2026-04-08T12:00:00.000Z"),
          quantityDelta: -2,
          skuId: "sku_1",
          sourceKey: "order_line_1",
          sourceType: "sale-line",
        }),
      (error: unknown) => error instanceof StockMovementSyncConflictError,
    );
  });

  it("blocks outbound sync when the balance row does not exist", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.syncMovement({
          locationId: "loc_store_1",
          movementType: "sale",
          occurredAt: new Date("2026-04-08T12:00:00.000Z"),
          quantityDelta: -1,
          skuId: "sku_1",
          sourceKey: "order_line_1",
          sourceType: "sale-line",
        }),
      (error: unknown) => error instanceof StockBalanceNotFoundError,
    );
  });

  it("blocks sync when the movement would reduce on-hand below reserved stock", async () => {
    const harness = createHarness({
      balance: createBalance({
        onHandQuantity: 6,
        reservedQuantity: 4,
      }),
    });

    await assert.rejects(
      () =>
        harness.service.syncMovement({
          locationId: "loc_store_1",
          movementType: "sale",
          occurredAt: new Date("2026-04-08T12:00:00.000Z"),
          quantityDelta: -3,
          skuId: "sku_1",
          sourceKey: "order_line_1",
          sourceType: "sale-line",
        }),
      (error: unknown) => error instanceof StockBalanceAdjustmentConflictError,
    );
  });

  it("validates non-zero quantity deltas", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.syncMovement({
          locationId: "loc_store_1",
          movementType: "manual_adjustment",
          occurredAt: new Date("2026-04-08T12:00:00.000Z"),
          quantityDelta: 0,
          skuId: "sku_1",
          sourceKey: "adjustment_1",
          sourceType: "manual-adjustment",
        }),
      (error: unknown) => error instanceof InvalidStockBalanceInputError,
    );
  });
});

function createHarness(input?: {
  balance?: StockBalanceRecord | null;
  movements?: StockMovementRecord[];
}) {
  const state = {
    balance: input?.balance ?? null,
    movements: [...(input?.movements ?? [])],
  };
  const transaction: StockMovementSyncTransaction = {
    async findMovementBySource(command) {
      return (
        state.movements.find(
          (movement) =>
            movement.locationId === command.locationId &&
            movement.skuId === command.skuId &&
            movement.sourceKey === command.sourceKey &&
            movement.sourceType === command.sourceType,
        ) ?? null
      );
    },
    async getBalanceForUpdate() {
      return state.balance;
    },
    async insertBalance(command) {
      state.balance = createBalance({
        createdAt: command.createdAt,
        locationId: command.locationId,
        onHandQuantity: command.onHandQuantity,
        skuId: command.skuId,
        updatedAt: command.createdAt,
        updatedBy: command.updatedBy ?? null,
      });
      return state.balance;
    },
    async insertMovement(command) {
      const movement = createMovement({
        createdAt: command.createdAt,
        createdBy: command.createdBy ?? null,
        locationId: command.locationId,
        movementType: command.movementType,
        occurredAt: command.occurredAt,
        quantityDelta: command.quantityDelta,
        skuId: command.skuId,
        sourceKey: command.sourceKey,
        sourceType: command.sourceType,
      });
      state.movements.push(movement);
      return movement;
    },
    async updateOnHandQuantity(command) {
      assert.ok(state.balance);
      state.balance = createBalance({
        ...state.balance,
        locationId: command.locationId,
        onHandQuantity: command.onHandQuantity,
        skuId: command.skuId,
        updatedAt: command.updatedAt,
        updatedBy: command.updatedBy ?? null,
      });
      return state.balance;
    },
  };
  const repository: StockMovementSyncRepository = {
    async withTransaction(callback) {
      return callback(transaction);
    },
  };

  return {
    service: new StockMovementSyncService(repository),
    state,
  };
}

function createBalance(
  input?: Partial<StockBalanceRecord>,
): StockBalanceRecord {
  return {
    createdAt: input?.createdAt ?? new Date("2026-04-08T09:00:00.000Z"),
    id: input?.id ?? "bal_1",
    locationId: input?.locationId ?? "loc_store_1",
    onHandQuantity: input?.onHandQuantity ?? 0,
    reservedQuantity: input?.reservedQuantity ?? 0,
    skuId: input?.skuId ?? "sku_1",
    updatedAt: input?.updatedAt ?? new Date("2026-04-08T09:00:00.000Z"),
    updatedBy: input?.updatedBy ?? null,
  };
}

function createMovement(
  input?: Partial<StockMovementRecord>,
): StockMovementRecord {
  return {
    createdAt: input?.createdAt ?? new Date("2026-04-08T09:00:00.000Z"),
    createdBy: input?.createdBy ?? null,
    id: input?.id ?? `mov_${Math.random().toString(36).slice(2, 8)}`,
    locationId: input?.locationId ?? "loc_store_1",
    movementType: input?.movementType ?? "sale",
    occurredAt: input?.occurredAt ?? new Date("2026-04-08T09:00:00.000Z"),
    quantityDelta: input?.quantityDelta ?? -1,
    skuId: input?.skuId ?? "sku_1",
    sourceKey: input?.sourceKey ?? "source_1",
    sourceType: input?.sourceType ?? "sale-line",
  };
}
