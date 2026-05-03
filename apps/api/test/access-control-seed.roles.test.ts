import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SYSTEM_ROLES } from "../scripts/lib/access-control-seed.js";

describe("access control seeded roles", () => {
  it("lets managers create and track their own supply requests", () => {
    const managerRole = SYSTEM_ROLES.find((role) => role.slug === "manager");

    assert.ok(managerRole);
    assert.ok(managerRole.permissions.includes("stock.supply.request"));
    assert.ok(managerRole.permissions.includes("stock.supply.manage"));
  });

  it("grants the admin role the catalog change-history read permission", () => {
    const adminRole = SYSTEM_ROLES.find((role) => role.slug === "admin");

    assert.ok(adminRole);
    assert.ok(adminRole.permissions.includes("catalog.history.view"));
  });

  it("grants the admin role delivery lifecycle permissions", () => {
    const adminRole = SYSTEM_ROLES.find((role) => role.slug === "admin");

    assert.ok(adminRole);
    for (const permission of [
      "deliveries.create_from_sale",
      "deliveries.create_from_online_order",
      "deliveries.create_from_transfer",
      "deliveries.assign",
      "deliveries.reassign",
      "deliveries.dispatch",
      "deliveries.complete",
      "deliveries.cancel",
    ]) {
      assert.ok(adminRole.permissions.includes(permission), permission);
    }
  });
});
