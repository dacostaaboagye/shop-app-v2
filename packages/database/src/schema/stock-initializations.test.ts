import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import { stockBalanceInitializations } from "./index.js";

assert.equal(
  getTableName(stockBalanceInitializations),
  "stock_balance_initializations",
);
assert.equal(
  stockBalanceInitializations.openingQuantity.name,
  "opening_quantity",
);

const migrationSql = readAllMigrationSql();

assert.match(migrationSql, /stock_balance_initializations/);
assert.match(migrationSql, /stock_balance_initializations_sku_location_unique/);
assert.match(
  migrationSql,
  /stock_balance_initializations_opening_quantity_nonnegative/,
);

console.log("stock initialization schema assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");
  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
