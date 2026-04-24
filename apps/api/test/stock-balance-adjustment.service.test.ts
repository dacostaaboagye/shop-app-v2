import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InvalidStockBalanceInputError,
  StockBalanceAdjustmentConflictError,
  type StockBalanceAdjustmentRepository,
  type StockBalanceAdjustmentTransaction,
  StockBalanceAlreadyInitializedError,
  StockBalanceNotFoundError,
  type StockBalanceRecord,
} from "../src/modules/stock/stock-balance-adjustment.contracts.js";
import { StockBalanceAdjustmentService } from "../src/modules/stock/stock-balance-adjustment.service.js";

describe("StockBalanceAdjustmentService", () => {
  it("initializes a missing stock balance row", async () => {
    const harness = createHarness();

    const result = await harness.service.initializeBalance({
      locationId: "loc_store_1",
      now: new Date("2026-04-08T12:00:00.000Z"),
      openingQuantity: 10,
      skuId: "sku_1",
      updatedBy: "usr_manager_1",
    });

    assert.equal(result.status, "created");
    assert.equal(result.balance.onHandQuantity, 10);
    assert.equal(result.balance.reservedQuantity, 0);
  });

  it("returns a no-op for an idempotent initialization request", async () => {
    const harness = createHarness({
      balance: createBalance({
        onHandQuantity: 10,
        reservedQuantity: 0,
      }),
    });

    const result = await harness.service.initializeBalance({
      locationId: "loc_store_1",
      openingQuantity: 10,
      skuId: "sku_1",
    });

    assert.equal(result.status, "noop");
    assert.equal(result.balance.onHandQuantity, 10);
  });

  it("blocks initialization when a different balance already exists", async () => {
    const harness = createHarness({
      balance: createBalance({
        onHandQuantity: 12,
        reservedQuantity: 2,
      }),
    });

    await assert.rejects(
      () =>
        harness.service.initializeBalance({
          locationId: "loc_store_1",
          openingQuantity: 10,
          skuId: "sku_1",
        }),
      (error: unknown) => {
        assert.ok(error instanceof StockBalanceAlreadyInitializedError);
        assert.equal(error.details?.currentOnHandQuantity, 12);
        return true;
      },
    );
  });

  it("increments on-hand quantity for a positive adjustment", async () => {
    const harness = createHarness({
      balance: createBalance({
        onHandQuantity: 10,
        reservedQuantity: 3,
      }),
    });

    const result = await harness.service.adjustOnHandQuantity({
      locationId: "loc_store_1",
      now: new Date("2026-04-08T13:00:00.000Z"),
      quantityDelta: 4,
      skuId: "sku_1",
    });

    assert.equal(result.status, "adjusted");
    assert.equal(result.previousOnHandQuantity, 10);
    assert.equal(result.balance.onHandQuantity, 14);
  });

  it("decrements on-hand quantity while preserving reserved stock coverage", async () => {
    const harness = createHarness({
      balance: createBalance({
        onHandQuantity: 10,
        reservedQuantity: 3,
      }),
    });

    const result = await harness.service.adjustOnHandQuantity({
      locationId: "loc_store_1",
      quantityDelta: -6,
      skuId: "sku_1",
    });

    assert.equal(result.balance.onHandQuantity, 4);
  });

  it("blocks adjustments when the balance row does not exist", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.adjustOnHandQuantity({
          locationId: "loc_store_1",
          quantityDelta: 3,
          skuId: "sku_1",
        }),
      (error: unknown) => error instanceof StockBalanceNotFoundError,
    );
  });

  it("blocks adjustments that would reduce on-hand below reserved quantity", async () => {
    const harness = createHarness({
      balance: createBalance({
        onHandQuantity: 10,
        reservedQuantity: 4,
      }),
    });

    await assert.rejects(
      () =>
        harness.service.adjustOnHandQuantity({
          locationId: "loc_store_1",
          quantityDelta: -7,
          skuId: "sku_1",
        }),
      (error: unknown) => {
        assert.ok(error instanceof StockBalanceAdjustmentConflictError);
        assert.equal(error.details?.nextOnHandQuantity, 3);
        return true;
      },
    );
  });

  it("validates opening quantity and non-zero adjustments", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.initializeBalance({
          locationId: "loc_store_1",
          openingQuantity: -1,
          skuId: "sku_1",
        }),
      (error: unknown) => error instanceof InvalidStockBalanceInputError,
    );
    await assert.rejects(
      () =>
        harness.service.adjustOnHandQuantity({
          locationId: "loc_store_1",
          quantityDelta: 0,
          skuId: "sku_1",
        }),
      (error: unknown) => error instanceof InvalidStockBalanceInputError,
    );
  });
});

function createHarness(input?: { balance?: StockBalanceRecord | null }) {
  const state = {
    balance: input?.balance ?? null,
  };
  const transaction: StockBalanceAdjustmentTransaction = {
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
  const repository: StockBalanceAdjustmentRepository = {
    async withTransaction(callback) {
      return callback(transaction);
    },
  };

  return {
    service: new StockBalanceAdjustmentService(repository),
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
