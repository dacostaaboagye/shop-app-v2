import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UnassignedProductError } from "../src/modules/inventory-ownership/ownership-event-write.service.js";
import type { OwnershipHandoverRepository } from "../src/modules/inventory-ownership/ownership-handover.contracts.js";
import { OwnershipHandoverService } from "../src/modules/inventory-ownership/ownership-handover.service.js";
import {
  type OwnershipEventRecord,
  type OwnershipQueryRepository,
  OwnershipQueryService,
} from "../src/modules/inventory-ownership/ownership-query.service.js";

describe("OwnershipHandoverService", () => {
  it("creates a standard handover lifecycle with two insert-only rows", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "assigned",
        workerId: "usr_worker_a",
      }),
    });

    const result = await harness.service.initiateHandover({
      fromWorkerId: "usr_worker_a",
      initiatedBy: "usr_manager_1",
      locationId: "loc_store_1",
      now: new Date("2026-04-08T12:00:00.000Z"),
      skuId: "sku_1",
      toWorkerId: "usr_worker_b",
    });

    assert.equal(harness.state.insertedEvents.length, 2);
    assert.equal(result.handoverOutEvent.eventType, "handover_out");
    assert.equal(result.handoverInEvent.eventType, "handover_in");
    assert.equal(
      result.handoverOutEvent.handoverChainId,
      result.handoverInEvent.handoverChainId,
    );
    assert.ok(
      result.handoverInEvent.effectiveFrom >=
        result.handoverOutEvent.effectiveFrom,
    );
  });

  it("ends a handover early by inserting a reverted event", async () => {
    const latestChainEvent = createEvent({
      eventType: "handover_in",
      handoverChainId: "chain_1",
      workerId: "usr_worker_b",
    });
    const harness = createHarness({
      latestChainById: { chain_1: latestChainEvent },
      originalWorkerByChainId: { chain_1: "usr_worker_a" },
    });

    const result = await harness.service.endHandover({
      endedBy: "usr_manager_1",
      handoverChainId: "chain_1",
      now: new Date("2026-04-08T13:00:00.000Z"),
      originalWorkerId: "usr_worker_a",
    });

    assert.equal(result.status, "created");
    assert.equal(result.event.eventType, "reverted");
    assert.equal(result.event.workerId, "usr_worker_a");
    assert.equal(harness.state.insertedEvents.length, 1);
  });

  it("auto-reverts expired handovers through endHandover", async () => {
    const harness = createHarness({
      expiredChainIds: ["chain_1"],
      latestChainById: {
        chain_1: createEvent({
          eventType: "handover_in",
          handoverChainId: "chain_1",
          workerId: "usr_worker_b",
        }),
      },
      originalWorkerByChainId: { chain_1: "usr_worker_a" },
    });

    const result = await harness.service.autoRevertExpiredHandovers({
      endedBy: "usr_system",
      expiredBefore: new Date("2026-04-09T12:00:00.000Z"),
      now: new Date("2026-04-09T12:00:00.000Z"),
    });

    assert.deepEqual(result.endedChainIds, ["chain_1"]);
    assert.equal(harness.state.insertedEvents.length, 1);
    assert.equal(harness.state.insertedEvents[0]?.eventType, "reverted");
  });

  it("chains a handover to a third worker with two new rows", async () => {
    const harness = createHarness({
      latestChainById: {
        chain_1: createEvent({
          eventType: "handover_in",
          handoverChainId: "chain_1",
          workerId: "usr_worker_b",
        }),
      },
    });

    const result = await harness.service.chainHandover({
      currentReceivingWorkerId: "usr_worker_b",
      handoverChainId: "chain_1",
      initiatedBy: "usr_manager_1",
      newWorkerId: "usr_worker_c",
      now: new Date("2026-04-08T14:00:00.000Z"),
    });

    assert.equal(result.status, "created");
    assert.equal(result.handoverOutEvent.workerId, "usr_worker_b");
    assert.equal(result.handoverInEvent.workerId, "usr_worker_c");
    assert.equal(harness.state.insertedEvents.length, 2);
  });

  it("reverts a chained handover back to the original worker", async () => {
    const harness = createHarness({
      latestChainById: {
        chain_1: createEvent({
          eventType: "handover_in",
          handoverChainId: "chain_1",
          workerId: "usr_worker_c",
        }),
      },
      originalWorkerByChainId: { chain_1: "usr_worker_a" },
    });

    const result = await harness.service.endHandover({
      endedBy: "usr_manager_1",
      handoverChainId: "chain_1",
      originalWorkerId: "usr_worker_a",
    });

    assert.equal(result.status, "created");
    assert.equal(result.event.workerId, "usr_worker_a");
  });

  it("treats duplicate endHandover as a no-op", async () => {
    const harness = createHarness({
      latestChainById: {
        chain_1: createEvent({
          eventType: "reverted",
          handoverChainId: "chain_1",
          workerId: "usr_worker_a",
        }),
      },
    });

    const result = await harness.service.endHandover({
      endedBy: "usr_manager_1",
      handoverChainId: "chain_1",
      originalWorkerId: "usr_worker_a",
    });

    assert.equal(result.status, "noop");
    assert.equal(harness.state.insertedEvents.length, 0);
  });

  it("blocks handover initiation when the sku is unassigned", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.initiateHandover({
          fromWorkerId: "usr_worker_a",
          initiatedBy: "usr_manager_1",
          locationId: "loc_store_1",
          skuId: "sku_1",
          toWorkerId: "usr_worker_b",
        }),
      (error: unknown) => {
        assert.ok(error instanceof UnassignedProductError);
        return true;
      },
    );
  });
});

function createHarness(input?: {
  expiredChainIds?: string[];
  latestChainById?: Record<string, OwnershipEventRecord>;
  latestEvent?: OwnershipEventRecord | null;
  originalWorkerByChainId?: Record<string, string>;
}) {
  const state = {
    insertedEvents: [] as OwnershipEventRecord[],
  };
  const queryRepository: OwnershipQueryRepository = {
    async getLatestEventAtOrBefore() {
      return input?.latestEvent ?? null;
    },
    async getOwnershipHistory() {
      return [];
    },
  };
  const handoverRepository: OwnershipHandoverRepository = {
    async findExpiredActiveHandoverChainIds() {
      return input?.expiredChainIds ?? [];
    },
    async getLatestChainEvent(handoverChainId) {
      return input?.latestChainById?.[handoverChainId] ?? null;
    },
    async getOriginalWorkerForChain(handoverChainId) {
      return input?.originalWorkerByChainId?.[handoverChainId] ?? null;
    },
    async insertHandoverPair(command) {
      // JS Dates only keep millisecond precision; use +1ms here to model the
      // repository's Postgres-side microsecond tie-break.
      const handoverOutEvent = createEvent({
        createdAt: command.effectiveFrom,
        effectiveFrom: command.effectiveFrom,
        eventType: "handover_out",
        handoverChainId: command.handoverChainId,
        locationId: command.locationId,
        skuId: command.skuId,
        workerId: command.fromWorkerId,
      });
      const handoverInEvent = createEvent({
        createdAt: command.effectiveFrom,
        effectiveFrom: new Date(command.effectiveFrom.getTime() + 1),
        eventType: "handover_in",
        handoverChainId: command.handoverChainId,
        id: "evt_handover_in",
        locationId: command.locationId,
        skuId: command.skuId,
        workerId: command.toWorkerId,
      });
      state.insertedEvents.push(handoverOutEvent, handoverInEvent);
      return { handoverInEvent, handoverOutEvent };
    },
    async insertRevertedEvent(command) {
      const event = createEvent({
        createdAt: command.effectiveFrom,
        effectiveFrom: command.effectiveFrom,
        eventType: "reverted",
        handoverChainId: command.handoverChainId,
        id: "evt_reverted",
        locationId: command.locationId,
        skuId: command.skuId,
        quantity: command.quantity,
        workerId: command.workerId,
      });
      state.insertedEvents.push(event);
      return event;
    },
  };

  return {
    service: new OwnershipHandoverService(
      handoverRepository,
      new OwnershipQueryService(queryRepository),
    ),
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
