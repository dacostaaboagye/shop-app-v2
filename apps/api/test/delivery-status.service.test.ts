import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DeliveryRecord } from "../src/modules/deliveries/delivery.types.js";
import { DeliverySourceNotFoundError } from "../src/modules/deliveries/delivery-errors.js";
import { DeliveryStatusCompose } from "../src/modules/deliveries/delivery-status.compose.js";
import {
  DeliveryAssignmentRequiredError,
  DeliveryCancellationReasonRequiredError,
  DeliveryIllegalStatusTransitionError,
  DeliveryStatusConflictError,
  DeliveryTerminalStatusError,
} from "../src/modules/deliveries/delivery-status.errors.js";
import { DeliveryStatusServiceImpl } from "../src/modules/deliveries/delivery-status.service.js";
import type {
  DeliveryStatusWriteRepository,
  DeliveryStatusWriteTransaction,
  TransitionStatusInput,
} from "../src/modules/deliveries/postgres-delivery-status-write.repository.js";

const ACTOR = "00000000-0000-4000-8000-000000000099";
const DELIVERY_ID = "00000000-0000-4000-8000-000000000001";
const DELIVERY_REFERENCE = "DLV-00001";
const ASSIGNEE = "00000000-0000-4000-8000-000000000010";

function buildDelivery(
  overrides: Partial<DeliveryRecord> = {},
): DeliveryRecord {
  return {
    deliveryId: DELIVERY_ID,
    deliveryReference: DELIVERY_REFERENCE,
    sourceType: "transfer",
    sourceReference: "TRF-0001",
    status: "draft",
    originLocationId: "00000000-0000-4000-8000-000000000020",
    originLocationSlug: "main-store",
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
    assignedUserSlug: null,
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
    createdBySlug: "actor-slug",
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
  async appendPlatformEvent(): Promise<void> {}
  async transitionStatus(
    input: TransitionStatusInput,
  ): Promise<DeliveryRecord | null> {
    this.transitionCalls.push(input);
    return this.transitionResult;
  }
}

class FakeRepository implements DeliveryStatusWriteRepository {
  public lastTx: FakeTransaction | null = null;
  constructor(private readonly tx: FakeTransaction) {}
  async withTransaction<T>(
    callback: (transaction: DeliveryStatusWriteTransaction) => Promise<T>,
  ): Promise<T> {
    this.lastTx = this.tx;
    return callback(this.tx);
  }
}

class AlwaysEligiblePort {
  async isEligibleAgent(): Promise<boolean> {
    return true;
  }
}

function buildService(tx: FakeTransaction) {
  const repo = new FakeRepository(tx);
  const compose = new DeliveryStatusCompose({
    repository: repo,
    agentEligibilityPort: new AlwaysEligiblePort(),
  });
  return new DeliveryStatusServiceImpl(compose);
}

describe("DeliveryStatusService.assign", () => {
  it("rejects assign without assignedUserId", async () => {
    const service = buildService(new FakeTransaction(buildDelivery()));
    await assert.rejects(
      () =>
        service.assign({
          deliveryId: DELIVERY_ID,
          assignedUserId: "",
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliveryAssignmentRequiredError,
    );
  });

  it("returns not-found when delivery is missing", async () => {
    const service = buildService(new FakeTransaction(null));
    await assert.rejects(
      () =>
        service.assign({
          deliveryId: DELIVERY_ID,
          assignedUserId: ASSIGNEE,
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliverySourceNotFoundError,
    );
  });

  it("returns noop when delivery already assigned to the same user", async () => {
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
    assert.equal(tx.transitionCalls.length, 0);
  });

  it("rejects assign when delivery is in a terminal state", async () => {
    const service = buildService(
      new FakeTransaction(buildDelivery({ status: "completed" })),
    );
    await assert.rejects(
      () =>
        service.assign({
          deliveryId: DELIVERY_ID,
          assignedUserId: ASSIGNEE,
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliveryTerminalStatusError,
    );
  });

  it("performs the transition when state is valid", async () => {
    const tx = new FakeTransaction(
      buildDelivery(),
      buildDelivery({
        status: "assigned",
        assignedUserId: ASSIGNEE,
        assignedAt: new Date("2026-05-02T10:00:00Z"),
      }),
    );
    const service = buildService(tx);
    const result = await service.assign({
      deliveryId: DELIVERY_ID,
      assignedUserId: ASSIGNEE,
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
    });
    assert.equal(result.status, "transitioned");
    assert.equal(result.fromStatus, "draft");
    assert.equal(result.toStatus, "assigned");
    assert.equal(tx.transitionCalls.length, 1);
    assert.equal(tx.transitionCalls[0]?.assignedUserId, ASSIGNEE);
  });

  it("surfaces a status conflict when the CAS update returns no row", async () => {
    const tx = new FakeTransaction(buildDelivery(), null);
    const service = buildService(tx);
    await assert.rejects(
      () =>
        service.assign({
          deliveryId: DELIVERY_ID,
          assignedUserId: ASSIGNEE,
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliveryStatusConflictError,
    );
  });
});

describe("DeliveryStatusService.dispatch", () => {
  it("rejects dispatch from draft as illegal_transition", async () => {
    const service = buildService(new FakeTransaction(buildDelivery()));
    await assert.rejects(
      () =>
        service.dispatch({
          deliveryId: DELIVERY_ID,
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliveryIllegalStatusTransitionError,
    );
  });

  it("transitions assigned to in_transit", async () => {
    const tx = new FakeTransaction(
      buildDelivery({ status: "assigned", assignedUserId: ASSIGNEE }),
      buildDelivery({
        status: "in_transit",
        assignedUserId: ASSIGNEE,
        dispatchedAt: new Date("2026-05-03T10:00:00Z"),
      }),
    );
    const service = buildService(tx);
    const result = await service.dispatch({
      deliveryId: DELIVERY_ID,
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
    });
    assert.equal(result.status, "transitioned");
    assert.equal(result.toStatus, "in_transit");
  });
});

describe("DeliveryStatusService.complete", () => {
  it("transitions in_transit to completed", async () => {
    const tx = new FakeTransaction(
      buildDelivery({
        status: "in_transit",
        assignedUserId: ASSIGNEE,
        assignedAt: new Date("2026-05-03T09:00:00Z"),
        dispatchedAt: new Date("2026-05-03T10:00:00Z"),
      }),
      buildDelivery({
        status: "completed",
        assignedUserId: ASSIGNEE,
        completedAt: new Date("2026-05-03T11:00:00Z"),
      }),
    );
    const service = buildService(tx);
    const result = await service.complete({
      deliveryId: DELIVERY_ID,
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
    });

    assert.equal(result.status, "transitioned");
    assert.equal(result.toStatus, "completed");
    assert.equal(tx.transitionCalls[0]?.nextStatus, "completed");
  });
});

describe("DeliveryStatusService.cancel", () => {
  it("rejects cancel without a non-empty reason", async () => {
    const service = buildService(new FakeTransaction(buildDelivery()));
    await assert.rejects(
      () =>
        service.cancel({
          deliveryId: DELIVERY_ID,
          reason: "   ",
          actorUserId: ACTOR,
          actorUserSlug: "actor-slug",
        }),
      DeliveryCancellationReasonRequiredError,
    );
  });

  it("transitions any non-terminal state to cancelled with reason persisted", async () => {
    const tx = new FakeTransaction(
      buildDelivery({ status: "assigned", assignedUserId: ASSIGNEE }),
      buildDelivery({
        status: "cancelled",
        assignedUserId: ASSIGNEE,
        cancellationReason: "Address invalid",
        cancelledAt: new Date("2026-05-03T10:00:00Z"),
      }),
    );
    const service = buildService(tx);
    const result = await service.cancel({
      deliveryId: DELIVERY_ID,
      reason: "Address invalid",
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
    });
    assert.equal(result.status, "transitioned");
    assert.equal(result.toStatus, "cancelled");
    assert.equal(tx.transitionCalls[0]?.cancellationReason, "Address invalid");
  });

  it("noop when already cancelled with same reason", async () => {
    const tx = new FakeTransaction(
      buildDelivery({
        status: "cancelled",
        cancellationReason: "Customer changed mind",
      }),
    );
    const service = buildService(tx);
    const result = await service.cancel({
      deliveryId: DELIVERY_ID,
      reason: "Customer changed mind",
      actorUserId: ACTOR,
      actorUserSlug: "actor-slug",
    });
    assert.equal(result.status, "noop");
  });
});
