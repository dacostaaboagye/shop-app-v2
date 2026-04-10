CREATE TYPE "public"."stock_movement_type" AS ENUM('sale', 'delivery_receipt', 'delivery_dispatch', 'transfer_in', 'transfer_out', 'manual_adjustment');--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"movement_type" "stock_movement_type" NOT NULL,
	"source_type" varchar(64) NOT NULL,
	"source_key" varchar(160) NOT NULL,
	"quantity_delta" integer NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_quantity_delta_nonzero" CHECK ("stock_movements"."quantity_delta" <> 0)
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movements_sku_location_occurred_idx" ON "stock_movements" USING btree ("sku_id","location_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_source_unique" ON "stock_movements" USING btree ("sku_id","location_id","source_type","source_key");