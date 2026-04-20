import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import {
  catalogCategories,
  catalogEntityStatusEnum,
  catalogMediaAssignments,
  catalogProductOptions,
  catalogProductOptionValues,
  catalogProducts,
  deliveries,
  deliveryItems,
  deliveryStatusEnum,
  mediaAssets,
  platformEventAudienceKindEnum,
  platformEventDeliveryStatusEnum,
  platformEventAudiences,
  platformEvents,
  officialDocumentSettings,
  officialDocumentTypeEnum,
  issuedDocuments,
  locationDocumentSettings,
  permissionAuditActionEnum,
  permissionAuditLog,
  permissionOverrideEffectEnum,
  permissions,
  productVariants,
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
  userNotificationStatusEnum,
  userNotifications,
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
assert.equal(getTableName(catalogCategories), "catalog_categories");
assert.equal(getTableName(catalogProducts), "catalog_products");
assert.equal(getTableName(deliveries), "deliveries");
assert.equal(getTableName(deliveryItems), "delivery_items");
assert.equal(getTableName(productVariants), "product_variants");
assert.equal(getTableName(stockBalances), "stock_balances");
assert.equal(getTableName(stockMovements), "stock_movements");
assert.equal(getTableName(stockOwnershipEvents), "stock_ownership_events");
assert.equal(getTableName(stockReservations), "stock_reservations");
assert.equal(getTableName(platformEvents), "platform_events");
assert.equal(getTableName(officialDocumentSettings), "official_document_settings");
assert.equal(getTableName(locationDocumentSettings), "location_document_settings");
assert.equal(getTableName(issuedDocuments), "issued_documents");
assert.equal(getTableName(platformEventAudiences), "platform_event_audiences");
assert.equal(getTableName(userNotifications), "user_notifications");
assert.ok(!("effectiveTo" in stockOwnershipEvents));
assert.ok(!("productId" in stockOwnershipEvents));
assert.ok("skuId" in stockOwnershipEvents);

assert.deepEqual(permissionOverrideEffectEnum.enumValues, ["allow", "deny"]);
assert.deepEqual(catalogEntityStatusEnum.enumValues, ["active", "archived"]);
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
assert.deepEqual(platformEventAudienceKindEnum.enumValues, [
  "user",
  "permission",
]);
assert.deepEqual(platformEventDeliveryStatusEnum.enumValues, [
  "pending",
  "processing",
  "delivered",
  "failed",
]);
assert.deepEqual(userNotificationStatusEnum.enumValues, ["unread", "read"]);
assert.deepEqual(officialDocumentTypeEnum.enumValues, [
  "sales_receipt",
  "sales_invoice",
  "credit_note",
  "refund_note",
  "goods_transfer_note",
  "dispatch_note",
  "stock_adjustment",
  "stock_count",
  "purchase_order",
  "supplier_invoice",
]);

assert.equal(userPermissionOverrides.removedBy.name, "removed_by");
assert.equal(userPermissionOverrides.removedReason.name, "removed_reason");
assert.equal(permissionAuditLog.locationId.name, "location_id");
assert.equal(permissionAuditLog.overrideEffect.name, "override_effect");
assert.equal(deliveries.originLocationId.name, "origin_location_id");
assert.equal(deliveryItems.itemReference.name, "item_reference");
assert.equal(catalogProducts.categoryId.name, "category_id");
assert.equal(catalogProducts.features.name, "features");
assert.equal(getTableName(catalogProductOptions), "catalog_product_options");
assert.equal(
  getTableName(catalogProductOptionValues),
  "catalog_product_option_values",
);
assert.equal(catalogProductOptions.productId.name, "product_id");
assert.equal(catalogProductOptionValues.optionId.name, "option_id");
assert.equal(productVariants.unitOfMeasure.name, "unit_of_measure");
assert.equal(getTableName(mediaAssets), "media_assets");
assert.equal(
  getTableName(catalogMediaAssignments),
  "catalog_media_assignments",
);
assert.equal(catalogMediaAssignments.assetId.name, "asset_id");
assert.equal(catalogMediaAssignments.entitySlug.name, "entity_slug");
assert.equal(platformEventAudiences.eventId.name, "event_id");
assert.equal(userNotifications.readAt.name, "read_at");
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
assert.match(migrationSql, /catalog_entity_status/);
assert.match(migrationSql, /catalog_categories_name_per_parent_unique/);
assert.match(migrationSql, /product_variants_barcode_unique/);
assert.match(migrationSql, /product_variants_default_per_product_unique/);
assert.match(migrationSql, /product_variants_cost_price_nonnegative/);
assert.match(migrationSql, /media_assets/);
assert.match(migrationSql, /platform_event_audience_kind/);
assert.match(migrationSql, /platform_event_delivery_status/);
assert.match(migrationSql, /user_notification_status/);
assert.match(migrationSql, /platform_events_resource_idx/);
assert.match(migrationSql, /platform_events_delivery_idx/);
assert.match(migrationSql, /platform_events_delivery_attempts_nonnegative/);
assert.match(migrationSql, /platform_event_audiences_shape_check/);
assert.match(migrationSql, /user_notifications_user_event_unique/);
assert.match(migrationSql, /user_notifications_read_at_check/);
assert.match(migrationSql, /official_document_settings/);
assert.match(migrationSql, /location_document_settings/);
assert.match(migrationSql, /official_document_type/);
assert.match(migrationSql, /issued_documents/);
assert.match(migrationSql, /catalog_media_assignments/);
assert.match(migrationSql, /catalog_media_assignments_primary_unique/);
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
