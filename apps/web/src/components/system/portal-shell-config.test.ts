import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPermissionAbility } from "@/lib/authorization/permission-ability";
import { getRouteItem, getVisibleNavSections } from "./portal-shell-config";

describe("portal-shell-config", () => {
  it("shows the expanded access navigation only for the matching permissions", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility([
        "access.roles.view",
        "access.users.view",
        "access.permissions.view",
      ]),
    );
    const accessSection = sections.find(
      (section) => section.title === "Access",
    );

    assert.deepEqual(
      accessSection?.items.map((item) => item.label),
      ["Access overview", "Roles", "User access", "Permissions"],
    );
  });

  it("does not show User access when only users.view is granted", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility(["users.view"]),
    );
    const accessSection = sections.find((s) => s.title === "Access");

    assert.equal(accessSection, undefined);
  });

  it("shows Locations to any user with locations.view regardless of portal role", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility(["locations.view"]),
    );
    const adminSection = sections.find((s) => s.title === "Administration");

    assert.deepEqual(
      adminSection?.items.map((item) => item.label),
      ["Locations"],
    );
  });

  it("does not show Locations to a user without locations.view", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility(["worker.dashboard.view"]),
    );
    const adminSection = sections.find((s) => s.title === "Administration");

    assert.equal(adminSection, undefined);
  });

  it("shows settings as a section with configuration subpages", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility(["settings.documents.view"]),
    );
    const settingsSection = sections.find((s) => s.title === "Settings");

    assert.deepEqual(
      settingsSection?.items.map((item) => item.label),
      [
        "Overview",
        "Brand",
        "Business",
        "Money",
        "Documents",
        "Email templates",
        "Email operations",
        "Location overrides",
      ],
    );
  });

  it("shows both Overview entries for a user with admin + worker dashboard permissions", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility([
        "admin.dashboard.view",
        "worker.dashboard.view",
      ]),
    );
    const overviewSection = sections.find((s) => s.title === "Overview");

    assert.deepEqual(
      overviewSection?.items.map((item) => item.label),
      ["Admin overview", "My overview"],
    );
  });

  it("keeps Account as the last sidebar section", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility([
        "admin.dashboard.view",
        "users.view",
        "settings.documents.view",
      ]),
    );

    assert.equal(sections.at(-1)?.title, "Account");
  });

  it("orders admin sections by operational importance before Account", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility([
        "admin.dashboard.view",
        "orders.view",
        "catalog.view",
        "stock.supply.manage",
        "users.view",
        "settings.documents.view",
      ]),
    );

    const sectionTitles = sections.map((section) => section.title);

    assert.ok(
      sectionTitles.indexOf("Overview") < sectionTitles.indexOf("Commerce"),
    );
    assert.ok(
      sectionTitles.indexOf("Commerce") < sectionTitles.indexOf("Catalog"),
    );
    assert.ok(
      sectionTitles.indexOf("Catalog") < sectionTitles.indexOf("Supply"),
    );
    assert.ok(
      sectionTitles.indexOf("Supply") < sectionTitles.indexOf("Administration"),
    );
    assert.ok(
      sectionTitles.indexOf("Administration") <
        sectionTitles.indexOf("Settings"),
    );
    assert.ok(
      sectionTitles.indexOf("Settings") < sectionTitles.indexOf("Account"),
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

  it("resolves getRouteItem for /admin/products/new to the hidden New product entry", () => {
    const item = getRouteItem("/admin/products/new");

    assert.equal(item?.label, "New product");
    assert.equal(item?.requiredPermission, "catalog.products.manage");
  });

  it("resolves getRouteItem for /admin/products/brands/new to the hidden New brand entry", () => {
    const item = getRouteItem("/admin/products/brands/new");

    assert.equal(item?.label, "New brand");
    assert.equal(item?.requiredPermission, "catalog.brands.manage");
  });

  it("resolves getRouteItem for /admin/products/categories/new to the hidden New category entry", () => {
    const item = getRouteItem("/admin/products/categories/new");

    assert.equal(item?.label, "New category");
    assert.equal(item?.requiredPermission, "catalog.categories.manage");
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

  it("keeps global admin stock pages out of the topbar location selector", () => {
    const stockLevels = getRouteItem("/admin/stock/balances");
    const reservations = getRouteItem("/admin/stock/reservations");
    const stockTakes = getRouteItem("/admin/stock/takes");
    const transfers = getRouteItem("/admin/transfers");

    assert.equal(stockLevels?.label, "Global stock levels");
    assert.equal(stockLevels?.requiredPermission, "admin.dashboard.view");
    assert.equal(stockLevels?.locationSelectorPermission, null);
    assert.equal(reservations?.label, "Global reservations");
    assert.equal(reservations?.requiredPermission, "admin.dashboard.view");
    assert.equal(reservations?.locationSelectorPermission, null);
    assert.equal(stockTakes?.label, "Global stock-takes");
    assert.equal(stockTakes?.requiredPermission, "inventory.write");
    assert.equal(stockTakes?.locationSelectorPermission, null);
    assert.equal(transfers?.label, "Network transfers");
    assert.equal(transfers?.requiredPermission, "stock.supply.manage");
    assert.equal(transfers?.locationSelectorPermission, null);
  });

  it("does not show admin Supply stock pages to location-scoped managers", () => {
    const sections = getVisibleNavSections(
      createPermissionAbility([
        "manager.dashboard.view",
        "inventory.read",
        "stock.view",
      ]),
    );
    const supplySection = sections.find((s) => s.title === "Supply");
    const operationsSection = sections.find((s) => s.title === "Operations");

    assert.equal(supplySection, undefined);
    assert.ok(
      operationsSection?.items.some((item) => item.href === "/manager/stock"),
    );
  });

  it("keeps manager stock and manager supply requests as distinct sidebar paths", () => {
    const stockLevels = getRouteItem("/manager/stock");
    const reservations = getRouteItem("/manager/stock/reservations");
    const stockTakes = getRouteItem("/manager/stock/takes");
    const supplyRequests = getRouteItem("/manager/stock/supply-requests");

    assert.equal(stockLevels?.label, "Location stock");
    assert.equal(stockLevels?.requiredPermission, "stock.view");
    assert.equal(reservations?.label, "Reservations");
    assert.equal(reservations?.requiredPermission, "stock.view");
    assert.equal(stockTakes?.label, "Stock-take sheets");
    assert.equal(stockTakes?.requiredPermission, "inventory.write");
    assert.equal(supplyRequests?.label, "Supply requests");
    assert.equal(supplyRequests?.requiredPermission, "stock.supply.manage");
  });
});
