import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type OwnershipEventRecord,
  type OwnershipQueryRepository,
  OwnershipQueryService,
} from "../src/modules/inventory-ownership/ownership-query.service.js";

describe("OwnershipQueryService", () => {
  it("returns the assigned worker for a standard assignment", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "assigned",
        workerId: "usr_worker_1",
      }),
    });

    const ownerId = await harness.service.getCurrentOwner({
      locationId: "loc_store_1",
      now: new Date("2026-04-08T12:00:00.000Z"),
      skuId: "sku_1",
    });

    assert.equal(ownerId, "usr_worker_1");
  });

  it("returns the handover receiver during an active handover", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "handover_in",
        handoverChainId: "chain_1",
        workerId: "usr_worker_2",
      }),
    });

    const ownerId = await harness.service.getOwnerAt({
      locationId: "loc_store_1",
      skuId: "sku_1",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
    });

    assert.equal(ownerId, "usr_worker_2");
  });

  it("returns the original worker after handover reversion", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "reverted",
        workerId: "usr_worker_1",
      }),
    });

    const ownerId = await harness.service.getOwnerAt({
      locationId: "loc_store_1",
      skuId: "sku_1",
      timestamp: new Date("2026-04-09T08:00:00.000Z"),
    });

    assert.equal(ownerId, "usr_worker_1");
  });

  it("returns the latest active handover receiver in a chain", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "handover_in",
        handoverChainId: "chain_1",
        workerId: "usr_worker_3",
      }),
    });

    const ownerId = await harness.service.getCurrentOwner({
      locationId: "loc_store_1",
      now: new Date("2026-04-09T10:00:00.000Z"),
      skuId: "sku_1",
    });

    assert.equal(ownerId, "usr_worker_3");
  });

  it("returns null for an unassigned sku", async () => {
    const harness = createHarness();

    const ownerId = await harness.service.getCurrentOwner({
      locationId: "loc_store_1",
      now: new Date("2026-04-08T12:00:00.000Z"),
      skuId: "sku_2",
    });

    assert.equal(ownerId, null);
  });

  it("returns null for a point-in-time query before the first event", async () => {
    const harness = createHarness();

    const ownerId = await harness.service.getOwnerAt({
      locationId: "loc_store_1",
      skuId: "sku_1",
      timestamp: new Date("2026-04-01T09:00:00.000Z"),
    });

    assert.equal(ownerId, null);
  });

  it("returns the correct worker for a point-in-time query between two events", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        effectiveFrom: new Date("2026-04-01T10:00:00.000Z"),
        eventType: "assigned",
        workerId: "usr_worker_1",
      }),
    });

    const ownerId = await harness.service.getOwnerAt({
      locationId: "loc_store_1",
      skuId: "sku_1",
      timestamp: new Date("2026-04-01T12:00:00.000Z"),
    });

    assert.equal(ownerId, "usr_worker_1");
  });

  it("returns ownership history in chronological order", async () => {
    const assignment = createEvent({
      createdAt: new Date("2026-04-01T08:00:00.000Z"),
      effectiveFrom: new Date("2026-04-01T08:00:00.000Z"),
      eventType: "assigned",
      workerId: "usr_worker_1",
    });
    const reassignment = createEvent({
      createdAt: new Date("2026-04-02T08:00:00.000Z"),
      effectiveFrom: new Date("2026-04-02T08:00:00.000Z"),
      eventType: "reassigned",
      workerId: "usr_worker_2",
    });
    const harness = createHarness({
      history: [assignment, reassignment],
    });

    const history = await harness.service.getOwnershipHistory({
      locationId: "loc_store_1",
      skuId: "sku_1",
    });

    assert.deepEqual(history, [assignment, reassignment]);
  });

  it("returns null and reports a warning when the latest event is a handover out", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "handover_out",
        handoverChainId: "chain_1",
        workerId: "usr_worker_1",
      }),
    });

    const ownerId = await harness.service.getOwnerAt({
      locationId: "loc_store_1",
      skuId: "sku_1",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
    });

    assert.equal(ownerId, null);
    assert.equal(harness.state.warnings.length, 1);
    assert.equal(
      harness.state.warnings[0]?.reason,
      "handover_without_receiver",
    );
  });

  it("returns null and reports a warning when the latest event is cancelled", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "cancelled",
        workerId: "usr_worker_1",
      }),
    });

    const ownerId = await harness.service.getOwnerAt({
      locationId: "loc_store_1",
      skuId: "sku_1",
      timestamp: new Date("2026-04-08T12:00:00.000Z"),
    });

    assert.equal(ownerId, null);
    assert.equal(harness.state.warnings.length, 1);
    assert.equal(harness.state.warnings[0]?.reason, "cancelled_owner_event");
  });
});

function createHarness(input?: {
  history?: OwnershipEventRecord[];
  latestEvent?: OwnershipEventRecord | null;
}) {
  const state = {
    warnings: [] as Array<{ reason: string }>,
  };
  const repository: OwnershipQueryRepository = {
    async getLatestEventAtOrBefore() {
      return input?.latestEvent ?? null;
    },
    async getOwnershipHistory() {
      return input?.history ?? [];
    },
  };

  return {
    service: new OwnershipQueryService(repository, {
      onWarning: (warning) => {
        state.warnings.push({ reason: warning.reason });
      },
    }),
    state,
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
