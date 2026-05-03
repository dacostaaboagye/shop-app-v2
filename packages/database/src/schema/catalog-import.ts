import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditColumns, publicUuidColumn } from "./common.js";
import { users } from "./identity.js";

export const catalogImportJobStatusEnum = pgEnum("catalog_import_job_status", [
  "queued",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
]);

export const catalogImportJobs = pgTable(
  "catalog_import_jobs",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 32 }).notNull(),
    status: catalogImportJobStatusEnum("status").default("queued").notNull(),
    originalFileName: varchar("original_file_name", { length: 240 }).notNull(),
    contentType: varchar("content_type", { length: 120 }).notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    rawCsv: text("raw_csv").notNull(),
    totalRows: integer("total_rows").default(0).notNull(),
    importedRows: integer("imported_rows").default(0).notNull(),
    failedRows: integer("failed_rows").default(0).notNull(),
    errorReport: jsonb("error_report")
      .$type<
        Array<{
          errors: Array<{
            code: string;
            field?: string | undefined;
            message: string;
            rowNumber: number;
          }>;
          originalRow: Record<string, string>;
          rowNumber: number;
        }>
      >()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("catalog_import_jobs_reference_unique").on(table.reference),
  ],
);
