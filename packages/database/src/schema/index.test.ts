import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import {
  permissionAuditActionEnum,
  permissionAuditLog,
  permissionOverrideEffectEnum,
  permissions,
  rolePermissions,
  roles,
  stockOwnershipEvents,
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
assert.equal(getTableName(stockOwnershipEvents), "stock_ownership_events");

assert.deepEqual(permissionOverrideEffectEnum.enumValues, ["allow", "deny"]);
assert.deepEqual(permissionAuditActionEnum.enumValues, [
  "role_assigned",
  "role_revoked",
  "override_set",
  "override_removed",
]);

assert.equal(userPermissionOverrides.removedBy.name, "removed_by");
assert.equal(userPermissionOverrides.removedReason.name, "removed_reason");
assert.equal(permissionAuditLog.locationId.name, "location_id");
assert.equal(permissionAuditLog.overrideEffect.name, "override_effect");

const migrationSql = readAllMigrationSql();

assert.match(migrationSql, /permission_override_effect/);
assert.match(migrationSql, /permission_audit_action/);
assert.match(migrationSql, /role_permissions_role_permission_idx/);
assert.match(migrationSql, /removed_by/);
assert.match(migrationSql, /override_effect/);

console.log("database schema foundation assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");

  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
