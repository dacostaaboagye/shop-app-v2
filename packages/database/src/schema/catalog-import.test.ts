import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import {
  catalogImportJobStatusEnum,
  catalogImportJobs,
} from "./catalog-import.js";

assert.equal(getTableName(catalogImportJobs), "catalog_import_jobs");
assert.equal(catalogImportJobs.reference.name, "reference");
assert.equal(catalogImportJobs.status.name, "status");
assert.equal(catalogImportJobs.rawCsv.name, "raw_csv");
assert.equal(catalogImportJobs.errorReport.name, "error_report");
assert.equal(catalogImportJobs.uploadedBy.notNull, true);
assert.deepEqual(catalogImportJobStatusEnum.enumValues, [
  "queued",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
]);

const allMigrationSql = readAllMigrationSql();

assert.match(allMigrationSql, /catalog_import_job_status/);
assert.match(allMigrationSql, /CREATE TABLE "catalog_import_jobs"/);
assert.match(allMigrationSql, /"uploaded_by" uuid NOT NULL/);
assert.match(allMigrationSql, /catalog_import_jobs_reference_unique/);

console.log("catalog-import schema assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");
  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
