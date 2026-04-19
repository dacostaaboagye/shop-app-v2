import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canUseAllPermissions,
  canUseAnyPermission,
  canUsePermission,
  createPermissionAbility,
  parsePermissionKey,
} from "./permission-ability";

describe("permission ability", () => {
  it("maps dotted permission keys into CASL action and subject pairs", () => {
    assert.deepEqual(parsePermissionKey("catalog.media.manage"), {
      action: "manage",
      permission: "catalog.media.manage",
      subject: "catalog.media",
    });
  });

  it("falls back to an access action when a permission key has no namespace", () => {
    assert.deepEqual(parsePermissionKey("dashboard"), {
      action: "access",
      permission: "dashboard",
      subject: "dashboard",
    });
  });

  it("builds an ability that checks permission keys through CASL", () => {
    const ability = createPermissionAbility([
      "locations.create",
      "catalog.media.manage",
      "catalog.media.manage",
    ]);

    assert.equal(canUsePermission(ability, "locations.create"), true);
    assert.equal(canUsePermission(ability, "catalog.media.manage"), true);
    assert.equal(canUsePermission(ability, "locations.view"), false);
  });

  it("supports any-of and all-of checks", () => {
    const ability = createPermissionAbility([
      "locations.create",
      "catalog.media.manage",
    ]);

    assert.equal(
      canUseAnyPermission(ability, [
        "catalog.products.manage",
        "catalog.media.manage",
      ]),
      true,
    );
    assert.equal(
      canUseAllPermissions(ability, [
        "locations.create",
        "catalog.media.manage",
      ]),
      true,
    );
    assert.equal(
      canUseAllPermissions(ability, ["locations.create", "locations.view"]),
      false,
    );
  });
});
