import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdminStaffProvisioningService } from "../src/modules/admin/admin-staff-provisioning.service.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";

const NOW = new Date("2026-05-06T20:15:00.000Z");
const ACTOR = {
  userId: "11111111-1111-4111-8111-111111111111",
  userSlug: "admin-user",
} as const;

describe("AdminStaffProvisioningService", () => {
  it("creates an internal user with password setup required", async () => {
    const events: PlatformEventRecord[] = [];
    const calls: unknown[] = [];
    const service = new AdminStaffProvisioningService(
      {
        async createStaffUser(input) {
          calls.push(input);
          return {
            status: "created",
            user: {
              email: input.email,
              firstName: input.firstName,
              lastName: input.lastName,
              requiresPasswordChange: true,
              slug: input.slug,
              status: "active",
            },
          };
        },
      },
      {
        async allocateSlug(input) {
          assert.equal(input.entityType, "user");
          return "store-worker";
        },
      },
      {
        async publish(event) {
          events.push(event);
        },
      },
    );

    const response = await service.createUser(
      ACTOR,
      {
        email: " Worker@Example.COM ",
        firstName: " Store ",
        lastName: " Worker ",
        reason: "New warehouse hire",
        roleAssignments: [
          {
            locationSlug: "downtown-store",
            roleSlug: "worker",
          },
        ],
      },
      NOW,
    );

    assert.equal(response.slug, "store-worker");
    assert.equal(response.email, "worker@example.com");
    assert.equal(response.requiresPasswordChange, true);
    assert.equal(events[0]?.type, "access.user.created");
    assert.deepEqual(calls, [
      {
        actorId: ACTOR.userId,
        email: "worker@example.com",
        firstName: "Store",
        lastName: "Worker",
        now: NOW,
        reason: "New warehouse hire",
        roleAssignments: [
          {
            locationSlug: "downtown-store",
            roleSlug: "worker",
          },
        ],
        slug: "store-worker",
      },
    ]);
  });

  it("requires scoped workforce roles to include a location", async () => {
    const service = new AdminStaffProvisioningService(
      {
        async createStaffUser() {
          throw new Error("Repository should not be called");
        },
      },
      {
        async allocateSlug() {
          throw new Error("Slug allocator should not be called");
        },
      },
    );

    await assert.rejects(
      () =>
        service.createUser(
          ACTOR,
          {
            email: "worker@example.com",
            firstName: "Store",
            lastName: "Worker",
            reason: "New hire",
            roleAssignments: [{ locationSlug: null, roleSlug: "worker" }],
          },
          NOW,
        ),
      {
        name: "AppError",
        message: 'Role "worker" must be assigned to a location.',
      },
    );
  });

  it("rejects duplicate staff emails without publishing an event", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new AdminStaffProvisioningService(
      {
        async createStaffUser() {
          return { status: "email_conflict" };
        },
      },
      {
        async allocateSlug() {
          return "store-worker";
        },
      },
      {
        async publish(event) {
          events.push(event);
        },
      },
    );

    await assert.rejects(
      () => service.createUser(ACTOR, validCreateUserInput(), NOW),
      {
        name: "AppError",
        message: "A user with this email already exists.",
      },
    );
    assert.equal(events.length, 0);
  });

  it("retries slug conflicts before returning the created staff user", async () => {
    const attemptedSlugs: string[] = [];
    const service = new AdminStaffProvisioningService(
      {
        async createStaffUser(input) {
          attemptedSlugs.push(input.slug);

          if (input.slug === "store-worker") {
            return { status: "slug_conflict" };
          }

          return {
            status: "created",
            user: {
              email: input.email,
              firstName: input.firstName,
              lastName: input.lastName,
              requiresPasswordChange: true,
              slug: input.slug,
              status: "active",
            },
          };
        },
      },
      {
        async allocateSlug() {
          return attemptedSlugs.length === 0
            ? "store-worker"
            : "store-worker-2";
        },
      },
    );

    const response = await service.createUser(
      ACTOR,
      validCreateUserInput(),
      NOW,
    );

    assert.equal(response.slug, "store-worker-2");
    assert.deepEqual(attemptedSlugs, ["store-worker", "store-worker-2"]);
  });

  it("returns created staff users when event publication fails", async () => {
    const logged: unknown[][] = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };

    try {
      const service = new AdminStaffProvisioningService(
        {
          async createStaffUser(input) {
            return {
              status: "created",
              user: {
                email: input.email,
                firstName: input.firstName,
                lastName: input.lastName,
                requiresPasswordChange: true,
                slug: input.slug,
                status: "active",
              },
            };
          },
        },
        {
          async allocateSlug() {
            return "store-worker";
          },
        },
        {
          async publish() {
            throw new Error("event store unavailable");
          },
        },
      );

      const response = await service.createUser(
        ACTOR,
        validCreateUserInput(),
        NOW,
      );

      assert.equal(response.slug, "store-worker");
      assert.equal(logged.length, 1);
      assert.match(String(logged[0]?.[0] ?? ""), /staff-created event/);
    } finally {
      console.error = originalConsoleError;
    }
  });
});

function validCreateUserInput() {
  return {
    email: "worker@example.com",
    firstName: "Store",
    lastName: "Worker",
    reason: "New warehouse hire",
    roleAssignments: [
      {
        locationSlug: "downtown-store",
        roleSlug: "worker",
      },
    ],
  };
}
