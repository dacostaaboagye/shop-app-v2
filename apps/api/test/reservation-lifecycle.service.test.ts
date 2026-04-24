import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InsufficientStockError,
  InvalidReservationInputError,
  ReservationStatusConflictError,
} from "../src/modules/stock/reservation-lifecycle.contracts.js";
import {
  createHarness,
  createReservationRecord,
} from "./reservation-lifecycle.service.test-helpers.js";

describe("StockReservationLifecycleService", () => {
  it("creates a reservation, locks the balance row, and increments reserved stock", async () => {
    const harness = createHarness({
      balance: {
        onHandQuantity: 10,
        reservedQuantity: 2,
      },
    });

    const result = await harness.service.createReservation({
      createdBy: "usr_manager_1",
      locationId: "loc_store_1",
      now: new Date("2026-04-08T12:00:00.000Z"),
      quantity: 3,
      skuId: "sku_1",
      sourceKey: "order_123",
      sourceType: "ecommerce",
      ttlMinutes: 15,
    });

    assert.equal(result.status, "created");
    assert.equal(result.reservation.status, "active");
    assert.equal(
      result.reservation.expiresAt?.toISOString(),
      "2026-04-08T12:15:00.000Z",
    );
    assert.equal(harness.state.balance?.reservedQuantity, 5);
    assert.deepEqual(harness.state.availabilityCommands, [
      {
        locationId: "loc_store_1",
        lock: "for_update",
        skuId: "sku_1",
      },
    ]);
  });

  it("returns a no-op when the same active source already has a reservation", async () => {
    const existingReservation = createReservationRecord({
      id: "res_existing",
      quantity: 2,
      sourceKey: "order_123",
      sourceType: "ecommerce",
    });
    const harness = createHarness({
      reservations: [existingReservation],
    });

    const result = await harness.service.createReservation({
      locationId: "loc_store_1",
      quantity: 2,
      skuId: "sku_1",
      sourceKey: "order_123",
      sourceType: "ecommerce",
      ttlMinutes: 15,
    });

    assert.equal(result.status, "noop");
    assert.equal(result.reservation.id, "res_existing");
    assert.equal(harness.state.insertedReservations.length, 0);
    assert.equal(harness.state.availabilityCommands.length, 0);
  });

  it("rejects a duplicate source create when the quantity changed", async () => {
    const existingReservation = createReservationRecord({
      id: "res_existing",
      quantity: 2,
      sourceKey: "order_123",
      sourceType: "ecommerce",
    });
    const harness = createHarness({
      reservations: [existingReservation],
    });

    await assert.rejects(
      () =>
        harness.service.createReservation({
          locationId: "loc_store_1",
          quantity: 3,
          skuId: "sku_1",
          sourceKey: "order_123",
          sourceType: "ecommerce",
          ttlMinutes: 15,
        }),
      (error: unknown) => {
        assert.ok(error instanceof ReservationStatusConflictError);
        assert.equal(error.details?.reservationId, "res_existing");
        return true;
      },
    );
  });

  it("throws InsufficientStockError when available stock is too low", async () => {
    const harness = createHarness({
      balance: {
        onHandQuantity: 5,
        reservedQuantity: 4,
      },
      reservations: [
        createReservationRecord({
          id: "res_active_1",
          quantity: 4,
          status: "active",
        }),
      ],
    });

    await assert.rejects(
      () =>
        harness.service.createReservation({
          locationId: "loc_store_1",
          quantity: 2,
          skuId: "sku_1",
          sourceKey: "order_123",
          sourceType: "ecommerce",
          ttlMinutes: 15,
        }),
      (error: unknown) => {
        assert.ok(error instanceof InsufficientStockError);
        assert.equal(error.details?.availableQuantity, 1);
        return true;
      },
    );
    assert.equal(harness.state.insertedReservations.length, 0);
    assert.equal(harness.state.balance?.reservedQuantity, 4);
  });

  it("confirms an active reservation and decrements on-hand plus reserved stock", async () => {
    const activeReservation = createReservationRecord({
      id: "res_confirm",
      quantity: 2,
      status: "active",
    });
    const harness = createHarness({
      balance: {
        onHandQuantity: 10,
        reservedQuantity: 2,
      },
      reservations: [activeReservation],
    });

    const result = await harness.service.confirmReservation({
      now: new Date("2026-04-08T13:00:00.000Z"),
      reservationId: "res_confirm",
    });

    assert.equal(result.status, "confirmed");
    assert.equal(result.reservation.status, "confirmed");
    assert.equal(harness.state.balance?.onHandQuantity, 8);
    assert.equal(harness.state.balance?.reservedQuantity, 0);
  });

  it("throws a clear conflict when confirming an already-confirmed reservation", async () => {
    const harness = createHarness({
      reservations: [
        createReservationRecord({
          id: "res_confirmed",
          status: "confirmed",
        }),
      ],
    });

    await assert.rejects(
      () =>
        harness.service.confirmReservation({
          reservationId: "res_confirmed",
        }),
      (error: unknown) => {
        assert.ok(error instanceof ReservationStatusConflictError);
        assert.equal(error.details?.currentStatus, "confirmed");
        return true;
      },
    );
  });

  it("releases an active reservation and restores reserved stock without touching on-hand stock", async () => {
    const activeReservation = createReservationRecord({
      id: "res_release",
      quantity: 3,
      status: "active",
    });
    const harness = createHarness({
      balance: {
        onHandQuantity: 10,
        reservedQuantity: 3,
      },
      reservations: [activeReservation],
    });

    const result = await harness.service.releaseReservation({
      now: new Date("2026-04-08T14:00:00.000Z"),
      reason: "customer_cancelled",
      reservationId: "res_release",
    });

    assert.equal(result.status, "released");
    assert.equal(result.reservation.status, "released");
    assert.equal(harness.state.balance?.onHandQuantity, 10);
    assert.equal(harness.state.balance?.reservedQuantity, 0);
  });

  it("treats a second release call as a no-op", async () => {
    const releasedReservation = createReservationRecord({
      id: "res_released",
      status: "released",
    });
    const harness = createHarness({
      balance: {
        onHandQuantity: 10,
        reservedQuantity: 0,
      },
      reservations: [releasedReservation],
    });

    const result = await harness.service.releaseReservation({
      reason: "repeat_call",
      reservationId: "res_released",
    });

    assert.equal(result.status, "noop");
    assert.equal(harness.state.balance?.reservedQuantity, 0);
    assert.equal(harness.state.releaseCount, 0);
  });

  it("blocks release for a confirmed reservation so stock cannot be decremented twice", async () => {
    const harness = createHarness({
      reservations: [
        createReservationRecord({
          id: "res_confirmed",
          status: "confirmed",
        }),
      ],
    });

    await assert.rejects(
      () =>
        harness.service.releaseReservation({
          reason: "customer_cancelled",
          reservationId: "res_confirmed",
        }),
      (error: unknown) => {
        assert.ok(error instanceof ReservationStatusConflictError);
        assert.equal(error.details?.currentStatus, "confirmed");
        return true;
      },
    );
  });

  it("validates quantity, ttl, and release reason inputs", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.createReservation({
          locationId: "loc_store_1",
          quantity: 0,
          skuId: "sku_1",
          sourceKey: "order_123",
          sourceType: "ecommerce",
          ttlMinutes: 15,
        }),
      (error: unknown) => error instanceof InvalidReservationInputError,
    );
    await assert.rejects(
      () =>
        harness.service.createReservation({
          locationId: "loc_store_1",
          quantity: 1,
          skuId: "sku_1",
          sourceKey: "order_123",
          sourceType: "ecommerce",
          ttlMinutes: 0,
        }),
      (error: unknown) => error instanceof InvalidReservationInputError,
    );
    await assert.rejects(
      () =>
        harness.service.releaseReservation({
          reason: "   ",
          reservationId: "res_1",
        }),
      (error: unknown) => error instanceof InvalidReservationInputError,
    );
  });
});
