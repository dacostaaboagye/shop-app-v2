import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type OwnershipEventRecord,
  type OwnershipQueryRepository,
  OwnershipQueryService,
} from "../src/modules/inventory-ownership/ownership-query.service.js";
import {
  SaleAttributionUnavailableError,
  SalesAttributionService,
} from "../src/modules/inventory-ownership/sales-attribution.service.js";

describe("SalesAttributionService", () => {
  it("attributes a sale to the assigned worker at the sale timestamp", async () => {
    const assignment = createEvent({
      effectiveFrom: new Date("2026-04-08T10:00:00.000Z"),
      eventType: "assigned",
      workerId: "usr_worker_1",
    });
    const harness = createHarness({
      latestEvent: assignment,
    });

    const result = await harness.service.attributeSale({
      locationId: "loc_store_1",
      skuId: "sku_1",
      soldAt: new Date("2026-04-08T12:00:00.000Z"),
    });

    assert.equal(result.workerId, "usr_worker_1");
    assert.equal(result.ownershipEvent.id, assignment.id);
  });

  it("attributes a sale to the current handover receiver", async () => {
    const handoverIn = createEvent({
      eventType: "handover_in",
      handoverChainId: "chain_1",
      workerId: "usr_worker_2",
    });
    const harness = createHarness({
      latestEvent: handoverIn,
    });

    const result = await harness.service.attributeSale({
      locationId: "loc_store_1",
      skuId: "sku_1",
      soldAt: new Date("2026-04-08T12:00:00.000Z"),
    });

    assert.equal(result.workerId, "usr_worker_2");
  });

  it("throws when there is no owner event at the sale timestamp", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.attributeSale({
          locationId: "loc_store_1",
          skuId: "sku_1",
          soldAt: new Date("2026-04-08T12:00:00.000Z"),
        }),
      (error: unknown) => {
        assert.ok(error instanceof SaleAttributionUnavailableError);
        assert.equal(error.details?.reason, "missing_owner_event");
        return true;
      },
    );
  });

  it("throws when the latest owner event is cancelled", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "cancelled",
        workerId: "usr_worker_1",
      }),
    });

    await assert.rejects(
      () =>
        harness.service.attributeSale({
          locationId: "loc_store_1",
          skuId: "sku_1",
          soldAt: new Date("2026-04-08T12:00:00.000Z"),
        }),
      (error: unknown) => {
        assert.ok(error instanceof SaleAttributionUnavailableError);
        assert.equal(error.details?.reason, "cancelled_owner_event");
        return true;
      },
    );
  });

  it("throws when the latest event is a handover without a receiver", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "handover_out",
        handoverChainId: "chain_1",
        workerId: "usr_worker_1",
      }),
    });

    await assert.rejects(
      () =>
        harness.service.attributeSale({
          locationId: "loc_store_1",
          skuId: "sku_1",
          soldAt: new Date("2026-04-08T12:00:00.000Z"),
        }),
      (error: unknown) => {
        assert.ok(error instanceof SaleAttributionUnavailableError);
        assert.equal(error.details?.reason, "handover_without_receiver");
        return true;
      },
    );
  });
});

function createHarness(input?: { latestEvent?: OwnershipEventRecord | null }) {
  const repository: OwnershipQueryRepository = {
    async getLatestEventAtOrBefore() {
      return input?.latestEvent ?? null;
    },
    async getOwnershipHistory() {
      return [];
    },
  };

  return {
    service: new SalesAttributionService(new OwnershipQueryService(repository)),
  };
}

function createEvent(
  input?: Partial<OwnershipEventRecord>,
): OwnershipEventRecord {
  return {
    id: input?.id ?? "evt_1",
    createdAt: input?.createdAt ?? new Date("2026-04-08T09:00:00.000Z"),
    effectiveFrom: input?.effectiveFrom ?? new Date("2026-04-08T09:00:00.000Z"),
    eventType: input?.eventType ?? "assigned",
    handoverChainId: input?.handoverChainId ?? null,
    locationId: input?.locationId ?? "loc_store_1",
    skuId: input?.skuId ?? "sku_1",
    quantity: input?.quantity ?? 1,
    workerId: input?.workerId ?? "usr_worker_1",
  };
}
