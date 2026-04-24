import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { AccessTokenAuthenticationService } from "../src/modules/auth/access-token-authentication.service.js";
import { InMemoryPlatformEventBus } from "../src/modules/events/in-memory-platform-event-bus.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";
import { canActorReceivePlatformEvent } from "../src/modules/events/platform-event-access.js";

const ACTOR = {
  userId: "11111111-1111-4111-8111-111111111111",
  userSlug: "worker-a",
};

describe("platform events", () => {
  it("delivers published events to active subscribers only", async () => {
    const bus = new InMemoryPlatformEventBus();
    const delivered: string[] = [];
    const unsubscribe = bus.subscribe((event) => {
      delivered.push(event.type);
    });

    await bus.publish(makePlatformEvent({ type: "transfer.requested" }));
    unsubscribe();
    await bus.publish(makePlatformEvent({ type: "transfer.received" }));

    assert.deepEqual(delivered, ["transfer.requested"]);
  });

  it("grants event access to a directly addressed user", async () => {
    const visible = await canActorReceivePlatformEvent(
      makePlatformEvent({
        audience: [{ kind: "user", userId: ACTOR.userId }],
      }),
      ACTOR,
      {
        permissionService: {
          async assertHasPermission() {
            throw forbidden();
          },
        },
      },
    );

    assert.equal(visible, true);
  });

  it("grants event access through a matching permission scope", async () => {
    const calls: Array<{ locationId?: string; permission: string }> = [];
    const visible = await canActorReceivePlatformEvent(
      makePlatformEvent({
        audience: [
          {
            kind: "permission",
            locationId: "loc-1",
            permission: "stock.supply.manage",
          },
        ],
      }),
      ACTOR,
      {
        permissionService: {
          async assertHasPermission(input) {
            calls.push({
              ...(input.locationId ? { locationId: input.locationId } : {}),
              permission: input.permission,
            });
          },
        },
      },
    );

    assert.equal(visible, true);
    assert.deepEqual(calls, [
      {
        locationId: "loc-1",
        permission: "stock.supply.manage",
      },
    ]);
  });

  it("hides events when no audience rule matches the actor", async () => {
    const visible = await canActorReceivePlatformEvent(
      makePlatformEvent({
        audience: [
          {
            kind: "permission",
            locationId: "loc-1",
            permission: "stock.supply.manage",
          },
        ],
      }),
      ACTOR,
      {
        permissionService: {
          async assertHasPermission() {
            throw forbidden();
          },
        },
      },
    );

    assert.equal(visible, false);
  });

  it("propagates non-forbidden permission failures", async () => {
    const dependencyFailure = new AccessTokenAuthenticationService(
      {
        async findUserById() {
          return null;
        },
      },
      "secret",
    );

    await assert.rejects(
      canActorReceivePlatformEvent(
        makePlatformEvent({
          audience: [
            { kind: "permission", permission: "admin.dashboard.view" },
          ],
        }),
        ACTOR,
        {
          permissionService: {
            async assertHasPermission() {
              await dependencyFailure.authenticate("bad-token");
            },
          },
        },
      ),
      /invalid or has expired/i,
    );
  });
});

function makePlatformEvent(
  overrides: Partial<PlatformEventRecord> = {},
): PlatformEventRecord {
  return {
    actor: {
      userSlug: "worker-a",
    },
    audience: [{ kind: "user", userId: ACTOR.userId }],
    id: "evt-1",
    occurredAt: "2026-04-19T20:00:00.000Z",
    payload: {
      status: "pending",
    },
    resource: {
      kind: "stock_transfer_request",
      reference: "SUP-0001",
    },
    summary: "SUP-0001 changed.",
    type: "transfer.requested",
    ...overrides,
  };
}

function forbidden() {
  return new AppError({
    code: "forbidden",
    detail: "You do not have permission to access this route.",
    statusCode: 403,
    title: "Forbidden",
  });
}
