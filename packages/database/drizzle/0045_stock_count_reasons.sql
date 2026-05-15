CREATE TYPE "public"."stock_adjustment_reason_code" AS ENUM('opening_count', 'cycle_count', 'damaged', 'found_stock', 'correction', 'shrinkage', 'return_restock');--> statement-breakpoint
ALTER TABLE "permission_audit_log" ALTER COLUMN "location_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "reason_code" "stock_adjustment_reason_code";--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "note" varchar(500);
