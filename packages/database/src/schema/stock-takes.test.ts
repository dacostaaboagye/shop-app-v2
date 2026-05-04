import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import {
  stockTakeLines,
  stockTakeModeEnum,
  stockTakeSessions,
  stockTakeStatusEnum,
} from "./index.js";

assert.equal(getTableName(stockTakeSessions), "stock_take_sessions");
assert.equal(getTableName(stockTakeLines), "stock_take_lines");
assert.deepEqual(stockTakeModeEnum.enumValues, ["blind", "assisted"]);
assert.equal(stockTakeStatusEnum.enumValues.includes("generated"), true);

const migrationSql = readAllMigrationSql();

assert.match(migrationSql, /stock_take_sessions_reference_unique/);
assert.match(migrationSql, /stock_take_lines_session_line_unique/);
assert.match(migrationSql, /stock_take_lines_session_sku_unique/);
assert.match(migrationSql, /stock_take_lines_line_number_positive/);
assert.match(migrationSql, /stock_take_lines_counted_quantity_nonnegative/);

console.log("stock take schema assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");
  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
