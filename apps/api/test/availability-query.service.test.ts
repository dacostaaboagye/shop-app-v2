import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type StockAvailabilityRepository,
  StockAvailabilityService,
  type StockAvailabilitySnapshot,
} from "../src/modules/stock/availability-query.service.js";

describe("StockAvailabilityService", () => {
  it("returns on-hand minus active reservations for a normal stock row", async () => {
    const harness = createHarness({
      snapshot: {
        activeReservationQuantity: 3,
        onHandQuantity: 10,
        reservedQuantity: 3,
      },
    });

    const availableStock = await harness.service.getAvailableStock({
      locationId: "loc_store_1",
      skuId: "sku_1",
    });

    assert.equal(availableStock, 7);
  });

  it("returns zero when the balance row has zero stock", async () => {
    const harness = createHarness({
      snapshot: {
        activeReservationQuantity: 0,
        onHandQuantity: 0,
        reservedQuantity: 0,
      },
    });

    const availableStock = await harness.service.getAvailableStock({
      locationId: "loc_store_1",
      skuId: "sku_1",
    });

    assert.equal(availableStock, 0);
  });

  it("returns zero when all stock is fully reserved", async () => {
    const harness = createHarness({
      snapshot: {
        activeReservationQuantity: 10,
        onHandQuantity: 10,
        reservedQuantity: 10,
      },
    });

    const availableStock = await harness.service.getAvailableStock({
      locationId: "loc_store_1",
      skuId: "sku_1",
    });

    assert.equal(availableStock, 0);
  });

  it("uses the balance reserved quantity for the default availability read path", async () => {
    const harness = createHarness({
      snapshot: {
        activeReservationQuantity: 2,
        onHandQuantity: 10,
        reservedQuantity: 4,
      },
    });

    const availableStock = await harness.service.getAvailableStock({
      locationId: "loc_store_1",
      skuId: "sku_1",
    });

    assert.equal(availableStock, 6);
  });

  it("clamps over-reserved anomalies to zero and reports a warning", async () => {
    const harness = createHarness({
      snapshot: {
        activeReservationQuantity: 12,
        onHandQuantity: 10,
        reservedQuantity: 12,
      },
    });

    const availableStock = await harness.service.getAvailableStock({
      locationId: "loc_store_1",
      skuId: "sku_1",
    });

    assert.equal(availableStock, 0);
    assert.equal(harness.state.warnings.length, 1);
    assert.equal(harness.state.warnings[0]?.reason, "over_reserved");
  });

  it("returns zero for a missing product-location balance row", async () => {
    const harness = createHarness();

    const availableStock = await harness.service.getAvailableStock({
      locationId: "loc_store_1",
      skuId: "sku_missing",
    });

    assert.equal(availableStock, 0);
    assert.equal(harness.state.warnings.length, 1);
    assert.equal(harness.state.warnings[0]?.reason, "missing_balance_row");
  });

  it("passes excludeReservationId and lock mode through to the repository", async () => {
    const harness = createHarness({
      snapshot: {
        activeReservationQuantity: 2,
        onHandQuantity: 10,
        reservedQuantity: 3,
      },
    });

    const availableStock = await harness.service.getAvailableStock({
      excludeReservationId: "res_1",
      locationId: "loc_store_1",
      lock: "for_update",
      skuId: "sku_1",
    });

    assert.equal(availableStock, 8);
    assert.deepEqual(harness.state.commands, [
      {
        excludeReservationId: "res_1",
        locationId: "loc_store_1",
        lock: "for_update",
        skuId: "sku_1",
      },
    ]);
  });
});

function createHarness(input?: {
  snapshot?: StockAvailabilitySnapshot | null;
}) {
  const state = {
    commands: [] as Array<{
      excludeReservationId?: string;
      locationId: string;
      lock?: "for_update";
      skuId: string;
    }>,
    warnings: [] as Array<{ reason: string }>,
  };

  const repository: StockAvailabilityRepository = {
    async getStockAvailabilitySnapshot(command) {
      state.commands.push(command);
      return input?.snapshot ?? null;
    },
  };

  return {
    service: new StockAvailabilityService(repository, {
      onWarning: (warning) => {
        state.warnings.push({ reason: warning.reason });
      },
    }),
    state,
  };
}
