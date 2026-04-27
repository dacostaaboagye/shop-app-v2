import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AssignmentCommandService } from "../src/modules/assignments/assignment-command.service.js";
import type { AssignmentEventContext } from "../src/modules/assignments/assignment-events.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";
import type { OwnershipEventRecord } from "../src/modules/inventory-ownership/ownership-query.service.js";

const ACTOR = {
  userId: "usr_manager_1",
  userSlug: "store-manager",
} as const;

describe("AssignmentCommandService", () => {
  it("publishes a durable event after creating an assignment", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.assignProduct({
      actor: ACTOR,
      locationId: "loc_store_1",
      quantity: 2,
      skuId: "sku_1",
      workerId: "usr_worker_b",
    });

    assert.equal(events[0]?.type, "assignment.assigned");
    assert.equal(
      events[0]?.summary,
      "Assignment created for Ama Mensah: Soap Bar Citrus (SOAP-001) x2 at Downtown Store.",
    );
  });

  it("publishes a durable event after reassigning an assignment", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events, {
      ...context(),
      workerId: "usr_worker_c",
      workerName: "Kojo Addo",
    });

    await service.reassignProduct({
      actor: ACTOR,
      locationId: "loc_store_1",
      newWorkerId: "usr_worker_c",
      skuId: "sku_1",
    });

    assert.equal(events[0]?.type, "assignment.reassigned");
    assert.equal(
      events[0]?.summary,
      "Assignment reassigned to Kojo Addo: Soap Bar Citrus (SOAP-001) x2 at Downtown Store.",
    );
  });

  it("publishes a durable event after starting a handover", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events, {
      ...context(),
      workerId: "usr_worker_c",
      workerName: "Kojo Addo",
    });

    await service.initiateHandover({
      actor: ACTOR,
      fromWorkerId: "usr_worker_b",
      locationId: "loc_store_1",
      skuId: "sku_1",
      toWorkerId: "usr_worker_c",
    });

    assert.equal(events[0]?.type, "assignment.handover_started");
    assert.equal(
      events[0]?.summary,
      "Handover started from Ama Mensah to Kojo Addo: Soap Bar Citrus (SOAP-001) x2 at Downtown Store.",
    );
  });

  it("publishes a durable event after reverting a handover", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.endHandover({
      actor: ACTOR,
      handoverChainId: "chain_1",
      originalWorkerId: "usr_worker_b",
    });

    assert.equal(events[0]?.type, "assignment.handover_reverted");
    assert.equal(
      events[0]?.summary,
      "Handover reverted to Ama Mensah: Soap Bar Citrus (SOAP-001) x2 at Downtown Store.",
    );
  });
});

function createService(
  events: PlatformEventRecord[],
  resolvedContext: AssignmentEventContext = context(),
) {
  const createdEvent = ownershipEvent({
    quantity: resolvedContext.quantity,
    workerId: resolvedContext.workerId,
  });

  return new AssignmentCommandService(
    {
      async assignProduct() {
        return { event: createdEvent, status: "created" as const };
      },
      async reassignProduct() {
        return { event: createdEvent, status: "created" as const };
      },
    },
    {
      async endHandover() {
        return {
          event: ownershipEvent({
            eventType: "reverted",
            handoverChainId: "chain_1",
            quantity: resolvedContext.quantity,
            workerId: resolvedContext.workerId,
          }),
          status: "created" as const,
        };
      },
      async initiateHandover() {
        return {
          handoverChainId: "chain_1",
          handoverInEvent: ownershipEvent({
            eventType: "handover_in",
            handoverChainId: "chain_1",
            quantity: resolvedContext.quantity,
            workerId: resolvedContext.workerId,
          }),
          handoverOutEvent: ownershipEvent({
            eventType: "handover_out",
            handoverChainId: "chain_1",
            quantity: resolvedContext.quantity,
            workerId: "usr_worker_b",
          }),
        };
      },
    },
    {
      async getAssignmentEventContext() {
        return resolvedContext;
      },
      async getWorkerName() {
        return "Ama Mensah";
      },
    },
    {
      async publish(event) {
        events.push(event);
      },
    },
  );
}

function context(): AssignmentEventContext {
  return {
    locationId: "loc_store_1",
    locationName: "Downtown Store",
    productName: "Soap Bar",
    quantity: 2,
    sku: "SOAP-001",
    skuId: "sku_1",
    variantName: "Citrus",
    workerId: "usr_worker_b",
    workerName: "Ama Mensah",
  };
}

function ownershipEvent(
  overrides: Partial<OwnershipEventRecord> = {},
): OwnershipEventRecord {
  return {
    createdAt: new Date("2026-04-26T18:00:00.000Z"),
    effectiveFrom: new Date("2026-04-26T18:00:00.000Z"),
    eventType: "assigned",
    handoverChainId: null,
    id: "evt_1",
    locationId: "loc_store_1",
    quantity: 2,
    skuId: "sku_1",
    workerId: "usr_worker_b",
    ...overrides,
  };
}
