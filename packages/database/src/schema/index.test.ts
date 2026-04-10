import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import {
  deliveries,
  deliveryItems,
  deliveryStatusEnum,
  permissionAuditActionEnum,
  permissionAuditLog,
  permissionOverrideEffectEnum,
  permissions,
  rolePermissions,
  roles,
  slugRedirects,
  stockBalances,
  stockMovements,
  stockMovementTypeEnum,
  stockOwnershipEvents,
  stockReservationStatusEnum,
  stockReservations,
  userPermissionOverrides,
  userRoles,
  users,
} from "./index.js";

assert.equal(getTableName(users), "users");
assert.equal(getTableName(permissions), "permissions");
assert.equal(getTableName(roles), "roles");
assert.equal(getTableName(rolePermissions), "role_permissions");
assert.equal(getTableName(userRoles), "user_roles");
assert.equal(
  getTableName(userPermissionOverrides),
  "user_permission_overrides",
);
assert.equal(getTableName(permissionAuditLog), "permission_audit_log");
assert.equal(getTableName(slugRedirects), "slug_redirects");
assert.equal(getTableName(deliveries), "deliveries");
assert.equal(getTableName(deliveryItems), "delivery_items");
assert.equal(getTableName(stockBalances), "stock_balances");
assert.equal(getTableName(stockMovements), "stock_movements");
assert.equal(getTableName(stockOwnershipEvents), "stock_ownership_events");
assert.equal(getTableName(stockReservations), "stock_reservations");
assert.ok(!("effectiveTo" in stockOwnershipEvents));
assert.ok(!("productId" in stockOwnershipEvents));
assert.ok("skuId" in stockOwnershipEvents);

assert.deepEqual(permissionOverrideEffectEnum.enumValues, ["allow", "deny"]);
assert.deepEqual(permissionAuditActionEnum.enumValues, [
  "role_assigned",
  "role_revoked",
  "override_set",
  "override_removed",
]);
assert.deepEqual(deliveryStatusEnum.enumValues, [
  "draft",
  "assigned",
  "in_transit",
  "completed",
  "cancelled",
]);
assert.deepEqual(stockReservationStatusEnum.enumValues, [
  "active",
  "confirmed",
  "released",
  "expired",
  "cancelled",
]);
assert.deepEqual(stockMovementTypeEnum.enumValues, [
  "sale",
  "delivery_receipt",
  "delivery_dispatch",
  "transfer_in",
  "transfer_out",
  "manual_adjustment",
]);

assert.equal(userPermissionOverrides.removedBy.name, "removed_by");
assert.equal(userPermissionOverrides.removedReason.name, "removed_reason");
assert.equal(permissionAuditLog.locationId.name, "location_id");
assert.equal(permissionAuditLog.overrideEffect.name, "override_effect");
assert.equal(deliveries.originLocationId.name, "origin_location_id");
assert.equal(deliveryItems.itemReference.name, "item_reference");
assert.equal(stockBalances.skuId.name, "sku_id");
assert.equal(stockMovements.quantityDelta.name, "quantity_delta");
assert.equal(stockReservations.sourceKey.name, "source_key");

const migrationSql = readAllMigrationSql();

assert.match(migrationSql, /permission_override_effect/);
assert.match(migrationSql, /permission_audit_action/);
assert.match(migrationSql, /role_permissions_role_permission_idx/);
assert.match(migrationSql, /removed_by/);
assert.match(migrationSql, /override_effect/);
assert.match(migrationSql, /slug_redirects_old_slug_unique/);
assert.match(migrationSql, /slug_redirects_old_new_check/);
assert.match(migrationSql, /delivery_status/);
assert.match(migrationSql, /delivery_items_reference_unique/);
assert.match(migrationSql, /delivery_items_quantity_positive/);
assert.match(migrationSql, /idx_ownership_resolution/);
assert.match(migrationSql, /idx_ownership_chain/);
assert.match(migrationSql, /idx_ownership_worker/);
assert.match(migrationSql, /stock_reservation_status/);
assert.match(migrationSql, /stock_movement_type/);
assert.match(migrationSql, /stock_balances_sku_location_unique/);
assert.match(migrationSql, /stock_balances_reserved_lte_on_hand/);
assert.match(migrationSql, /stock_movements_source_unique/);
assert.match(migrationSql, /stock_movements_quantity_delta_nonzero/);
assert.match(migrationSql, /stock_reservations_active_source_unique/);
assert.match(migrationSql, /stock_reservations_quantity_positive/);
assert.match(migrationSql, /stock_reservations_expiry_after_create/);
assert.match(
  migrationSql,
  /ALTER TABLE "stock_ownership_events" RENAME COLUMN "product_id" TO "sku_id"/,
);
assert.match(
  migrationSql,
  /ALTER TABLE "stock_ownership_events" DROP COLUMN "effective_to"/,
);
assert.match(migrationSql, /stock_ownership_events_quantity_positive/);

console.log("database schema foundation assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");

  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
