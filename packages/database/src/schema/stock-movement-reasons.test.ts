import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { stockAdjustmentReasonCodeEnum, stockMovements } from "./stock.js";

assert.deepEqual(stockAdjustmentReasonCodeEnum.enumValues, [
  "opening_count",
  "cycle_count",
  "damaged",
  "expired",
  "found_stock",
  "correction",
  "shrinkage",
  "stolen",
  "return_restock",
]);

const migrationSql = readdirSync(resolve(process.cwd(), "drizzle"))
  .filter((entry) => extname(entry) === ".sql")
  .map((entry) =>
    readFileSync(resolve(process.cwd(), "drizzle", entry), "utf8"),
  )
  .join("\n");

assert.match(migrationSql, /stock_adjustment_reason_code/);
assert.match(
  migrationSql,
  /ALTER TABLE "stock_movements" ADD COLUMN "reason_code"/,
);
assert.match(migrationSql, /ALTER TABLE "stock_movements" ADD COLUMN "note"/);
assert.ok(stockMovements.reasonCode);
assert.ok(stockMovements.note);

console.log("stock movement reason schema assertions passed");
