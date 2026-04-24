import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ActiveHandoverError,
  AlreadyAssignedError,
  type OwnershipEventWriteRepository,
  OwnershipEventWriteService,
  UnassignedProductError,
} from "../src/modules/inventory-ownership/ownership-event-write.service.js";
import {
  type OwnershipEventRecord,
  type OwnershipQueryRepository,
  OwnershipQueryService,
} from "../src/modules/inventory-ownership/ownership-query.service.js";

describe("OwnershipEventWriteService", () => {
  it("creates a fresh assignment with a single insert", async () => {
    const harness = createHarness();

    const result = await harness.service.assignProduct({
      assignedBy: "usr_manager_1",
      locationId: "loc_store_1",
      now: new Date("2026-04-08T12:00:00.000Z"),
      skuId: "sku_1",
      workerId: "usr_worker_1",
    });

    assert.equal(result.status, "created");
    assert.equal(result.event.eventType, "assigned");
    assert.equal(harness.state.insertedEvents.length, 1);
  });

  it("creates a reassignment without mutating prior rows", async () => {
    const currentEvent = createEvent({
      eventType: "assigned",
      workerId: "usr_worker_1",
    });
    const harness = createHarness({
      latestEvent: currentEvent,
    });

    const result = await harness.service.reassignProduct({
      locationId: "loc_store_1",
      newWorkerId: "usr_worker_2",
      now: new Date("2026-04-08T13:00:00.000Z"),
      skuId: "sku_1",
      reassignedBy: "usr_manager_1",
    });

    assert.equal(result.status, "created");
    assert.equal(result.event.eventType, "reassigned");
    assert.equal(harness.state.insertedEvents.length, 1);
    assert.deepEqual(harness.state.persistedEventsBeforeInsert, [currentEvent]);
  });

  it("returns a no-op when assigning the same worker twice", async () => {
    const currentEvent = createEvent({
      eventType: "assigned",
      workerId: "usr_worker_1",
    });
    const harness = createHarness({
      latestEvent: currentEvent,
    });

    const result = await harness.service.assignProduct({
      assignedBy: "usr_manager_1",
      locationId: "loc_store_1",
      skuId: "sku_1",
      workerId: "usr_worker_1",
    });

    assert.equal(result.status, "noop");
    assert.equal(result.event.id, currentEvent.id);
    assert.equal(harness.state.insertedEvents.length, 0);
  });

  it("blocks reassignment when an active handover is in progress", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "handover_in",
        handoverChainId: "chain_1",
        workerId: "usr_worker_2",
      }),
    });

    await assert.rejects(
      () =>
        harness.service.reassignProduct({
          locationId: "loc_store_1",
          newWorkerId: "usr_worker_3",
          skuId: "sku_1",
          reassignedBy: "usr_manager_1",
        }),
      (error: unknown) => {
        assert.ok(error instanceof ActiveHandoverError);
        assert.equal(error.details?.handoverChainId, "chain_1");
        return true;
      },
    );
    assert.equal(harness.state.insertedEvents.length, 0);
  });

  it("blocks reassignment when the sku is unassigned", async () => {
    const harness = createHarness();

    await assert.rejects(
      () =>
        harness.service.reassignProduct({
          locationId: "loc_store_1",
          newWorkerId: "usr_worker_2",
          skuId: "sku_1",
          reassignedBy: "usr_manager_1",
        }),
      (error: unknown) => {
        assert.ok(error instanceof UnassignedProductError);
        return true;
      },
    );
    assert.equal(harness.state.insertedEvents.length, 0);
  });

  it("blocks fresh assignment when another worker already owns the sku", async () => {
    const harness = createHarness({
      latestEvent: createEvent({
        eventType: "assigned",
        workerId: "usr_worker_1",
      }),
    });

    await assert.rejects(
      () =>
        harness.service.assignProduct({
          assignedBy: "usr_manager_1",
          locationId: "loc_store_1",
          skuId: "sku_1",
          workerId: "usr_worker_2",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AlreadyAssignedError);
        assert.equal(error.details?.currentWorkerId, "usr_worker_1");
        return true;
      },
    );
  });
});

function createHarness(input?: { latestEvent?: OwnershipEventRecord | null }) {
  const state = {
    insertedEvents: [] as OwnershipEventRecord[],
    persistedEventsBeforeInsert: input?.latestEvent ? [input.latestEvent] : [],
  };
  const queryRepository: OwnershipQueryRepository = {
    async getLatestEventAtOrBefore() {
      return input?.latestEvent ?? null;
    },
    async getOwnershipHistory() {
      return [];
    },
  };
  const queryService = new OwnershipQueryService(queryRepository);
  const writeRepository: OwnershipEventWriteRepository = {
    async insertOwnershipEvent(command) {
      const event = createEvent({
        createdAt: command.effectiveFrom,
        effectiveFrom: command.effectiveFrom,
        eventType: command.eventType,
        handoverChainId: command.handoverChainId,
        quantity: command.quantity,
        workerId: command.workerId,
      });
      state.insertedEvents.push(event);
      return event;
    },
  };

  return {
    service: new OwnershipEventWriteService(writeRepository, queryService),
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
