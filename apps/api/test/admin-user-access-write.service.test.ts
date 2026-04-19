import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { AdminUserAccessWriteService } from "../src/modules/admin/admin-user-access-write.service.js";

describe("AdminUserAccessWriteService", () => {
  it("requires a location when assigning manager or worker roles", async () => {
    const service = new AdminUserAccessWriteService(createRepository());

    await assert.rejects(
      () =>
        service.assignRole(
          "actor-1",
          "user-1",
          {
            locationSlug: null,
            reason: "Onboard manager",
            roleSlug: "manager",
          },
          new Date("2026-04-17T00:00:00.000Z"),
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.title, "Location scope required");
        return true;
      },
    );
  });

  it("passes location-scoped assignments through to the repository", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const service = new AdminUserAccessWriteService(
      createRepository({
        async assignRole(input) {
          calls.push(input);
        },
      }),
    );
    const now = new Date("2026-04-17T00:00:00.000Z");

    await service.assignRole(
      "actor-1",
      "user-1",
      {
        locationSlug: "downtown-store",
        reason: "Assign to store floor",
        roleSlug: "worker",
      },
      now,
    );

    assert.deepEqual(calls, [
      {
        actorId: "actor-1",
        locationSlug: "downtown-store",
        now,
        reason: "Assign to store floor",
        roleSlug: "worker",
        userSlug: "user-1",
      },
    ]);
  });
});

function createRepository(
  overrides: Partial<
    ConstructorParameters<typeof AdminUserAccessWriteService>[0]
  > = {},
) {
  return {
    async assignRole() {},
    async forcePasswordReset() {},
    async removePermissionOverride() {},
    async revokeRole() {},
    async setPermissionOverride() {},
    async updateProfile() {},
    async updateStatus() {},
    ...overrides,
  };
}
