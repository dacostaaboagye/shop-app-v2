import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import {
  catalogChangeEntityTypeEnum,
  catalogChangeLog,
  catalogChangeOperationEnum,
} from "./catalog-change-log.js";

assert.equal(getTableName(catalogChangeLog), "catalog_change_log");

assert.equal(catalogChangeLog.entityType.name, "entity_type");
assert.equal(catalogChangeLog.entityId.name, "entity_id");
assert.equal(catalogChangeLog.entityRef.name, "entity_ref");
assert.equal(catalogChangeLog.parentEntityType.name, "parent_entity_type");
assert.equal(catalogChangeLog.parentEntityId.name, "parent_entity_id");
assert.equal(catalogChangeLog.operation.name, "operation");
assert.equal(catalogChangeLog.changedFields.name, "changed_fields");
assert.equal(catalogChangeLog.before.name, "before");
assert.equal(catalogChangeLog.after.name, "after");
assert.equal(catalogChangeLog.actorId.name, "actor_id");
assert.equal(catalogChangeLog.occurredAt.name, "occurred_at");

assert.deepEqual(catalogChangeEntityTypeEnum.enumValues, [
  "catalog_brand",
  "catalog_category",
  "catalog_product",
  "product_variant",
  "catalog_product_option",
  "catalog_product_option_value",
]);

assert.deepEqual(catalogChangeOperationEnum.enumValues, [
  "created",
  "updated",
  "archived",
  "restored",
  "deleted",
]);

const allMigrationSql = readAllMigrationSql();

assert.match(
  allMigrationSql,
  /CREATE TABLE "catalog_change_log"/,
  "expected catalog_change_log create-table statement",
);
assert.match(
  allMigrationSql,
  /CREATE INDEX "catalog_change_log_entity_idx"/,
  "expected entity index for history-by-entity reads",
);
assert.match(
  allMigrationSql,
  /CREATE INDEX "catalog_change_log_parent_idx"/,
  "expected partial parent index",
);
assert.match(
  allMigrationSql,
  /"catalog_change_log_create_has_after"/,
  "expected created-has-after check constraint",
);
assert.match(
  allMigrationSql,
  /"catalog_change_log_delete_has_before"/,
  "expected deleted-has-before check constraint",
);
assert.match(
  allMigrationSql,
  /"catalog_change_log_update_has_both"/,
  "expected updated-has-both check constraint",
);

console.log("catalog-change-log schema assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");
  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
