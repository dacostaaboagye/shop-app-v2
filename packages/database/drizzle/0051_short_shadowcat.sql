ALTER TABLE "goods_transfer_notes" ADD COLUMN "received_quantity" integer;--> statement-breakpoint
ALTER TABLE "goods_transfer_notes" ADD COLUMN "receipt_discrepancy_reason" varchar(32);--> statement-breakpoint
ALTER TABLE "goods_transfer_notes" ADD COLUMN "receipt_discrepancy_notes" text;--> statement-breakpoint
ALTER TABLE "stock_supply_requests" ADD COLUMN "received_quantity" integer;--> statement-breakpoint
ALTER TABLE "stock_supply_requests" ADD COLUMN "receipt_discrepancy_reason" varchar(32);--> statement-breakpoint
ALTER TABLE "stock_supply_requests" ADD COLUMN "receipt_discrepancy_notes" text;--> statement-breakpoint
ALTER TABLE "goods_transfer_notes" ADD CONSTRAINT "gtn_received_qty_nonnegative" CHECK ("goods_transfer_notes"."received_quantity" IS NULL OR "goods_transfer_notes"."received_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "goods_transfer_notes" ADD CONSTRAINT "gtn_discrepancy_reason_check" CHECK ("goods_transfer_notes"."receipt_discrepancy_reason" IS NULL OR "goods_transfer_notes"."receipt_discrepancy_reason" IN ('short_received', 'damaged_received', 'wrong_item', 'other'));--> statement-breakpoint
ALTER TABLE "stock_supply_requests" ADD CONSTRAINT "supply_requests_received_qty_nonnegative" CHECK ("stock_supply_requests"."received_quantity" IS NULL OR "stock_supply_requests"."received_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "stock_supply_requests" ADD CONSTRAINT "supply_requests_discrepancy_reason_check" CHECK ("stock_supply_requests"."receipt_discrepancy_reason" IS NULL OR "stock_supply_requests"."receipt_discrepancy_reason" IN ('short_received', 'damaged_received', 'wrong_item', 'other'));