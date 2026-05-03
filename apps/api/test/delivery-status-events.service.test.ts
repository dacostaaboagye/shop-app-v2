import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DeliveryRecord } from "../src/modules/deliveries/delivery.types.js";
import { DeliveryStatusCompose } from "../src/modules/deliveries/delivery-status.compose.js";
import { DeliveryStatusServiceImpl } from "../src/modules/deliveries/delivery-status.service.js";
import type {
  DeliveryStatusWriteRepository,
  DeliveryStatusWriteTransaction,
  TransitionStatusInput,
} from "../src/modules/deliveries/postgres-delivery-status-write.repository.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";

const ACTOR = "00000000-0000-4000-8000-000000000099";
const DELIVERY_ID = "00000000-0000-4000-8000-000000000001";
const ASSIGNEE = "00000000-0000-4000-8000-000000000010";

class FakeTransaction implements DeliveryStatusWriteTransaction {
  public events: PlatformEventRecord[] = [];
  constructor(
    public initial: DeliveryRecord,
    public transitionResult: DeliveryRecord = initial,
  ) {}
  async findById(): Promise<DeliveryRecord> {
    return this.initial;
  }
  async appendPlatformEvent(event: PlatformEventRecord): Promise<void> {
    this.events.push(event);
  }
  async transitionStatus(
    _input: TransitionStatusInput,
  ): Promise<DeliveryRecord> {
    return this.transitionResult;
  }
}

class FakeRepository implements DeliveryStatusWriteRepository {
  constructor(private readonly tx: FakeTransaction) {}
  async withTransaction<T>(
    callback: (transaction: DeliveryStatusWriteTransaction) => Promise<T>,
  ): Promise<T> {
    return callback(this.tx);
  }
}

class AlwaysEligiblePort {
  async isEligibleAgent(): Promise<boolean> {
    return true;
  }
}

function buildService(tx: FakeTransaction) {
  const compose = new DeliveryStatusCompose({
    repository: new FakeRepository(tx),
    agentEligibilityPort: new AlwaysEligiblePort(),
    platformEventPublisher: {
      async appendWithinTransaction() {},
      async publish() {
        throw new Error("publish should not be used for lifecycle transitions");
      },
    },
  });
  return new DeliveryStatusServiceImpl(compose);
}

describe("DeliveryStatusService status events", () => {
  it("appends a status-changed event inside the transition transaction", async () => {
    const tx = new FakeTransaction(
      buildDelivery(),
      buildDelivery({ status: "assigned", assignedUserId: ASSIGNEE }),
    );
    const service = buildService(tx);
    const result = await service.assign({
      deliveryId: DELIVERY_ID,
      assignedUserId: ASSIGNEE,
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
      now: new Date("2026-05-03T10:00:00Z"),
    });

    assert.equal(result.status, "transitioned");
    assert.equal(tx.events.length, 1);
    assert.equal(tx.events[0]?.type, "delivery.status_changed");
    assert.deepEqual(tx.events[0]?.payload, {
      deliveryId: DELIVERY_ID,
      fromStatus: "draft",
      toStatus: "assigned",
      actorUserId: ACTOR,
      assignedUserId: ASSIGNEE,
      cancellationReason: null,
    });
  });

  it("does not append a duplicate event for a noop transition", async () => {
    const tx = new FakeTransaction(
      buildDelivery({ status: "assigned", assignedUserId: ASSIGNEE }),
    );
    const service = buildService(tx);
    const result = await service.assign({
      deliveryId: DELIVERY_ID,
      assignedUserId: ASSIGNEE,
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
    });

    assert.equal(result.status, "noop");
    assert.equal(tx.events.length, 0);
  });
});

function buildDelivery(
  overrides: Partial<DeliveryRecord> = {},
): DeliveryRecord {
  return {
    deliveryId: DELIVERY_ID,
    sourceType: "transfer",
    sourceReference: "TRF-0001",
    status: "draft",
    originLocationId: "00000000-0000-4000-8000-000000000020",
    destination: {
      kind: "location",
      locationId: "00000000-0000-4000-8000-000000000021",
    },
    items: [
      {
        deliveryItemId: "00000000-0000-4000-8000-000000000030",
        itemReference: "DEL-20260501-1",
        skuId: "00000000-0000-4000-8000-000000000040",
        quantity: 1,
      },
    ],
    assignedUserId: null,
    assignedAt: null,
    assignedBy: null,
    dispatchedAt: null,
    dispatchedBy: null,
    completedAt: null,
    completedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdAt: new Date("2026-05-01T10:00:00Z"),
    createdBy: ACTOR,
    ...overrides,
  };
}
