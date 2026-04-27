import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdminAccessWriteService } from "../src/modules/admin/admin-access-write.service.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";

const NOW = new Date("2026-04-26T16:00:00.000Z");
const ACTOR = {
  userId: "11111111-1111-4111-8111-111111111111",
  userSlug: "admin-user",
} as const;

describe("AdminAccessWriteService", () => {
  it("publishes a durable event after creating a role", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    const role = await service.createRole(
      ACTOR,
      {
        description: "Can reconcile operational access issues.",
        name: "Operations Reviewer",
        permissionKeys: ["access.audit.view"],
      },
      NOW,
    );

    assert.equal(role.slug, "operations-reviewer");
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "access.role.created");
    assert.equal(
      events[0]?.summary,
      "Access role created: Operations Reviewer (operations-reviewer) with 1 permission.",
    );
    assert.deepEqual(events[0]?.audience, [
      { kind: "permission", permission: "access.audit.view" },
    ]);
  });

  it("publishes a durable event after updating a role", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events, {
      assignedUserCount: 3,
      description: "Can reconcile operational access issues quickly.",
      isSystem: false,
      name: "Operations Reviewer",
      permissionCount: 2,
      permissions: [
        {
          assignedRoleCount: 2,
          description: "View audit records.",
          granted: true,
          key: "access.audit.view",
        },
        {
          assignedRoleCount: 4,
          description: "View roles.",
          granted: true,
          key: "access.roles.view",
        },
      ],
      slug: "operations-reviewer",
    });

    await service.updateRole(
      ACTOR,
      "operations-reviewer",
      {
        description: "Can reconcile operational access issues quickly.",
        name: "Operations Reviewer",
        permissionKeys: ["access.audit.view", "access.roles.view"],
      },
      NOW,
    );

    assert.equal(events[0]?.type, "access.role.updated");
    assert.equal(
      events[0]?.summary,
      "Access role updated: Operations Reviewer (operations-reviewer) now has 2 permissions.",
    );
  });
});

function createService(events: PlatformEventRecord[], role = roleDetail()) {
  return new AdminAccessWriteService(
    {
      async createRole() {
        return role;
      },
      async updateRole() {
        return role;
      },
    },
    {
      async publish(event) {
        events.push(event);
      },
    },
  );
}

function roleDetail() {
  return {
    assignedUserCount: 3,
    description: "Can reconcile operational access issues.",
    isSystem: false,
    name: "Operations Reviewer",
    permissionCount: 1,
    permissions: [
      {
        assignedRoleCount: 2,
        description: "View audit records.",
        granted: true,
        key: "access.audit.view",
      },
    ],
    slug: "operations-reviewer",
  };
}
