import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DeliveryAgentEligibilityPort } from "@shop/contracts";
import type { DeliveryRecord } from "../src/modules/deliveries/delivery.types.js";
import { DeliveryStatusCompose } from "../src/modules/deliveries/delivery-status.compose.js";
import {
  DeliveryAgentNotEligibleError,
  DeliveryReassignmentNotAllowedError,
} from "../src/modules/deliveries/delivery-status.errors.js";
import { DeliveryStatusServiceImpl } from "../src/modules/deliveries/delivery-status.service.js";
import type {
  DeliveryStatusWriteRepository,
  DeliveryStatusWriteTransaction,
  TransitionStatusInput,
} from "../src/modules/deliveries/postgres-delivery-status-write.repository.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";

const ACTOR = "00000000-0000-4000-8000-000000000099";
const DELIVERY_ID = "00000000-0000-4000-8000-000000000001";
const ALICE = "00000000-0000-4000-8000-000000000010";
const BOB = "00000000-0000-4000-8000-000000000011";

function buildDelivery(
  overrides: Partial<DeliveryRecord> = {},
): DeliveryRecord {
  return {
    deliveryId: DELIVERY_ID,
    sourceType: "transfer",
    sourceReference: "TRF-0001",
    status: "assigned",
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
    assignedUserId: ALICE,
    assignedAt: new Date("2026-05-01T10:00:00Z"),
    assignedBy: ACTOR,
    dispatchedAt: null,
    dispatchedBy: null,
    completedAt: null,
    completedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdAt: new Date("2026-05-01T09:00:00Z"),
    createdBy: ACTOR,
    ...overrides,
  };
}

class FakeTransaction implements DeliveryStatusWriteTransaction {
  public transitionCalls: TransitionStatusInput[] = [];
  constructor(
    public initial: DeliveryRecord | null,
    public transitionResult: DeliveryRecord | null = initial,
  ) {}
  async findById(): Promise<DeliveryRecord | null> {
    return this.initial;
  }
  async appendPlatformEvent(_event: PlatformEventRecord): Promise<void> {}
  async transitionStatus(
    input: TransitionStatusInput,
  ): Promise<DeliveryRecord | null> {
    this.transitionCalls.push(input);
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

class AlwaysEligiblePort implements DeliveryAgentEligibilityPort {
  async isEligibleAgent(): Promise<boolean> {
    return true;
  }
}

class NeverEligiblePort implements DeliveryAgentEligibilityPort {
  async isEligibleAgent(): Promise<boolean> {
    return false;
  }
}

function buildService(
  tx: FakeTransaction,
  port: DeliveryAgentEligibilityPort = new AlwaysEligiblePort(),
) {
  const repo = new FakeRepository(tx);
  const compose = new DeliveryStatusCompose({
    repository: repo,
    agentEligibilityPort: port,
  });
  return new DeliveryStatusServiceImpl(compose);
}

describe("DeliveryStatusService.reassign", () => {
  it("transitions assigned -> assigned with the new user", async () => {
    const tx = new FakeTransaction(
      buildDelivery({ assignedUserId: ALICE }),
      buildDelivery({ assignedUserId: BOB }),
    );
    const service = buildService(tx);
    const result = await service.reassign({
      deliveryId: DELIVERY_ID,
      assignedUserId: BOB,
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
    });
    assert.equal(result.status, "transitioned");
    assert.equal(result.toStatus, "assigned");
    assert.equal(tx.transitionCalls[0]?.assignedUserId, BOB);
  });

  it("noop when reassigning to the same user", async () => {
    const tx = new FakeTransaction(buildDelivery({ assignedUserId: ALICE }));
    const service = buildService(tx);
    const result = await service.reassign({
      deliveryId: DELIVERY_ID,
      assignedUserId: ALICE,
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
    });
    assert.equal(result.status, "noop");
    assert.equal(tx.transitionCalls.length, 0);
  });

  it("rejects reassign after dispatch", async () => {
    const tx = new FakeTransaction(
      buildDelivery({ status: "in_transit", assignedUserId: ALICE }),
    );
    const service = buildService(tx);
    await assert.rejects(
      () =>
        service.reassign({
          deliveryId: DELIVERY_ID,
          assignedUserId: BOB,
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliveryReassignmentNotAllowedError,
    );
  });

  it("rejects reassign to an ineligible agent", async () => {
    const tx = new FakeTransaction(buildDelivery({ assignedUserId: ALICE }));
    const service = buildService(tx, new NeverEligiblePort());
    await assert.rejects(
      () =>
        service.reassign({
          deliveryId: DELIVERY_ID,
          assignedUserId: BOB,
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliveryAgentNotEligibleError,
    );
  });
});

describe("DeliveryStatusService.assign with eligibility port", () => {
  it("rejects assign to an ineligible agent before transitioning", async () => {
    const tx = new FakeTransaction(buildDelivery({ status: "draft" }));
    const service = buildService(tx, new NeverEligiblePort());
    await assert.rejects(
      () =>
        service.assign({
          deliveryId: DELIVERY_ID,
          assignedUserId: ALICE,
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliveryAgentNotEligibleError,
    );
    assert.equal(tx.transitionCalls.length, 0);
  });
});
