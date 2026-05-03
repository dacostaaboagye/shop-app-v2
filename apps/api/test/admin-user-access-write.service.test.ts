import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdminUserAccessWriteService } from "../src/modules/admin/admin-user-access-write.service.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";

const NOW = new Date("2026-04-26T15:00:00.000Z");
const ACTOR = {
  userId: "11111111-1111-4111-8111-111111111111",
  userSlug: "admin-user",
} as const;

describe("AdminUserAccessWriteService", () => {
  it("publishes a durable event after assigning a user role", async () => {
    const events: PlatformEventRecord[] = [];
    const calls: unknown[] = [];
    const service = createService(events, calls);

    await service.assignRole(
      ACTOR,
      "ama-mensah",
      {
        locationSlug: "downtown-store",
        reason: "Assigned to downtown operations",
        roleSlug: "manager",
      },
      NOW,
    );

    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "access.user.role_assigned");
    assert.equal(
      events[0]?.summary,
      "Access updated for ama-mensah: assigned manager at downtown-store.",
    );
    assert.deepEqual(events[0]?.audience, [
      { kind: "permission", permission: "access.audit.view" },
    ]);
    assert.deepEqual(calls, [
      {
        actorId: ACTOR.userId,
        locationSlug: "downtown-store",
        now: NOW,
        reason: "Assigned to downtown operations",
        roleSlug: "manager",
        userSlug: "ama-mensah",
      },
    ]);
  });

  it("requires delivery agents to be assigned to a location", async () => {
    const service = createService([]);

    await assert.rejects(
      () =>
        service.assignRole(
          ACTOR,
          "kojo-agent",
          {
            locationSlug: null,
            reason: "Agent needs a delivery location scope",
            roleSlug: "agent",
          },
          NOW,
        ),
      {
        name: "AppError",
        message: 'Role "agent" must be assigned to a location.',
      },
    );
  });

  it("publishes a durable event after revoking a user role", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.revokeRole(
      ACTOR,
      "ama-mensah",
      "manager",
      {
        locationSlug: "downtown-store",
        reason: "Moved to another location",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "access.user.role_revoked");
    assert.equal(
      events[0]?.summary,
      "Access updated for ama-mensah: revoked manager at downtown-store.",
    );
  });

  it("publishes a durable event after setting an override", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.setPermissionOverride(
      ACTOR,
      "ama-mensah",
      {
        effect: "deny",
        locationSlug: null,
        permissionKey: "locations.create",
        reason: "Temporary freeze",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "access.user.override_set");
    assert.equal(
      events[0]?.summary,
      "Access override updated for ama-mensah: deny locations.create.",
    );
  });

  it("publishes a durable event after removing an override", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.removePermissionOverride(
      ACTOR,
      "ama-mensah",
      "locations.create",
      {
        locationSlug: null,
        reason: "Restriction lifted",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "access.user.override_removed");
    assert.equal(
      events[0]?.summary,
      "Access override removed for ama-mensah: locations.create.",
    );
  });

  it("publishes a durable event after updating a user profile", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.updateProfile(ACTOR, "ama-mensah", {
      email: "ama.updated@example.com",
      firstName: "Ama",
      lastName: "Updated",
    });

    assert.equal(events[0]?.type, "access.user.profile_updated");
    assert.equal(events[0]?.summary, "User profile updated for ama-mensah.");
  });

  it("publishes a durable event after updating user status", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.updateStatus(
      ACTOR,
      "ama-mensah",
      {
        reason: "Compliance hold",
        status: "suspended",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "access.user.status_updated");
    assert.equal(
      events[0]?.summary,
      "User status updated for ama-mensah: suspended.",
    );
  });

  it("publishes a durable event after forcing password reset", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.forcePasswordReset(
      ACTOR,
      "ama-mensah",
      {
        reason: "Security review",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "access.user.password_reset_required");
    assert.equal(events[0]?.summary, "Password reset required for ama-mensah.");
  });
});

function createService(
  events: PlatformEventRecord[],
  assignRoleCalls: unknown[] = [],
) {
  return new AdminUserAccessWriteService(
    {
      async assignRole(input) {
        assignRoleCalls.push(input);
      },
      async forcePasswordReset() {},
      async removePermissionOverride() {},
      async revokeRole() {},
      async setPermissionOverride() {},
      async updateProfile() {},
      async updateStatus() {},
    },
    {
      async publish(event) {
        events.push(event);
      },
    },
  );
}
