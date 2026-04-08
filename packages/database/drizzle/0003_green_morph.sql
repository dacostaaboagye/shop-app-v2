DROP INDEX "stock_ownership_events_current_owner_idx";--> statement-breakpoint
DROP INDEX "stock_ownership_events_handover_chain_idx";--> statement-breakpoint
ALTER TABLE "stock_ownership_events" RENAME COLUMN "product_id" TO "sku_id";--> statement-breakpoint
ALTER TABLE "stock_ownership_events" ALTER COLUMN "worker_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_ownership_events" ALTER COLUMN "effective_from" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX "idx_ownership_resolution" ON "stock_ownership_events" USING btree ("sku_id","location_id","effective_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ownership_chain" ON "stock_ownership_events" USING btree ("handover_chain_id") WHERE "stock_ownership_events"."handover_chain_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_ownership_worker" ON "stock_ownership_events" USING btree ("worker_id","effective_from" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "stock_ownership_events" DROP COLUMN "effective_to";--> statement-breakpoint
ALTER TABLE "stock_ownership_events" ADD CONSTRAINT "stock_ownership_events_quantity_positive" CHECK ("stock_ownership_events"."quantity" > 0);
