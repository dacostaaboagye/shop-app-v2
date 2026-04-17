import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPermissionGroups,
  getPermissionActionLabel,
  getPermissionSurfaceLabel,
} from "./access-control";

describe("access-control helpers", () => {
  it("derives human-readable surface and action labels", () => {
    assert.equal(
      getPermissionSurfaceLabel("access.roles.manage"),
      "Access / Roles",
    );
    assert.equal(getPermissionActionLabel("access.roles.manage"), "Manage");
    assert.equal(getPermissionSurfaceLabel("users.view"), "Users");
  });

  it("groups permissions by shared operational surface", () => {
    const groups = buildPermissionGroups([
      {
        description: "Manage roles",
        key: "access.roles.manage",
      },
      {
        description: "View roles",
        key: "access.roles.view",
      },
      {
        description: "View users",
        key: "users.view",
      },
    ]);

    assert.deepEqual(
      groups.map((group) => ({
        itemKeys: group.items.map((item) => item.key),
        key: group.key,
        label: group.label,
      })),
      [
        {
          itemKeys: ["access.roles.manage", "access.roles.view"],
          key: "access.roles",
          label: "Access / Roles",
        },
        {
          itemKeys: ["users.view"],
          key: "users",
          label: "Users",
        },
      ],
    );
  });
});
