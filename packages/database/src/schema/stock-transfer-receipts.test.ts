import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const migrationSql = readAllMigrationSql();

assert.match(migrationSql, /receipt_discrepancy_reason/);
assert.match(migrationSql, /supply_requests_received_qty_nonnegative/);
assert.match(migrationSql, /gtn_received_qty_nonnegative/);

console.log("stock transfer receipt schema assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");
  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
