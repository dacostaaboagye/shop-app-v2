import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CurrentUserPermissionService } from "../src/modules/auth/current-user-permission.service.js";

describe("CurrentUserPermissionService", () => {
  it("returns navigation permissions plus per-location permission scopes", async () => {
    const service = new CurrentUserPermissionService({
      async resolveAllPermissions(input) {
        assert.equal(input.userId, "usr_123");
        return {
          anyActivePermissions: [
            { key: "manager.dashboard.view" },
            { key: "stock.view" },
          ],
          locationScopes: [
            {
              locationId: "11111111-1111-4111-8111-111111111111",
              locationName: "Downtown Store",
              locationSlug: "downtown-store",
              permissions: [{ key: "stock.view" }, { key: "staff.view" }],
            },
            {
              locationId: "22222222-2222-4222-8222-222222222222",
              locationName: "Airport Store",
              locationSlug: "airport-store",
              permissions: [{ key: "stock.view" }],
            },
          ],
        };
      },
    });

    const result = await service.getCurrentPermissions("usr_123");

    assert.deepEqual(result, {
      locationScopes: [
        {
          locationId: "11111111-1111-4111-8111-111111111111",
          locationName: "Downtown Store",
          locationSlug: "downtown-store",
          permissions: ["stock.view", "staff.view"],
        },
        {
          locationId: "22222222-2222-4222-8222-222222222222",
          locationName: "Airport Store",
          locationSlug: "airport-store",
          permissions: ["stock.view"],
        },
      ],
      permissions: ["manager.dashboard.view", "stock.view"],
    });
  });
});
