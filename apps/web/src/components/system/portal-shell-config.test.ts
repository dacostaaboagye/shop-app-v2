import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRouteItem, getVisibleNavSections } from "./portal-shell-config";

describe("portal-shell-config", () => {
  it("shows the expanded access navigation only for the matching permissions", () => {
    const sections = getVisibleNavSections([
      "access.roles.view",
      "access.users.view",
      "access.permissions.view",
    ]);
    const accessSection = sections.find(
      (section) => section.title === "Access",
    );

    assert.deepEqual(
      accessSection?.items.map((item) => item.label),
      ["Access overview", "Roles", "User access", "Permissions"],
    );
  });

  it("does not show User access when only users.view is granted", () => {
    const sections = getVisibleNavSections(["users.view"]);
    const accessSection = sections.find((s) => s.title === "Access");

    assert.equal(accessSection, undefined);
  });

  it("shows Locations to any user with locations.view regardless of portal role", () => {
    const sections = getVisibleNavSections(["locations.view"]);
    const adminSection = sections.find((s) => s.title === "Administration");

    assert.deepEqual(
      adminSection?.items.map((item) => item.label),
      ["Locations"],
    );
  });

  it("does not show Locations to a user without locations.view", () => {
    const sections = getVisibleNavSections(["worker.dashboard.view"]);
    const adminSection = sections.find((s) => s.title === "Administration");

    assert.equal(adminSection, undefined);
  });

  it("shows both Overview entries for a user with admin + worker dashboard permissions", () => {
    const sections = getVisibleNavSections([
      "admin.dashboard.view",
      "worker.dashboard.view",
    ]);
    const overviewSection = sections.find((s) => s.title === "Overview");

    assert.deepEqual(
      overviewSection?.items.map((item) => item.label),
      ["Admin overview", "My overview"],
    );
  });

  it("resolves getRouteItem for /admin/locations to the Locations entry", () => {
    const item = getRouteItem("/admin/locations");

    assert.equal(item?.label, "Locations");
    assert.equal(item?.requiredPermission, "locations.view");
  });

  it("resolves getRouteItem for /admin/locations/new to the hidden New location entry", () => {
    const item = getRouteItem("/admin/locations/new");

    assert.equal(item?.label, "New location");
    assert.equal(item?.requiredPermission, "locations.create");
  });

  it("resolves getRouteItem for /worker/assignments to the Assignments entry", () => {
    const item = getRouteItem("/worker/assignments");

    assert.equal(item?.label, "Assignments");
    assert.equal(item?.requiredPermission, "worker.assignments.view");
  });

  it("resolves getRouteItem for /admin to the Admin overview entry", () => {
    const item = getRouteItem("/admin");

    assert.equal(item?.label, "Admin overview");
    assert.equal(item?.requiredPermission, "admin.dashboard.view");
  });
});
