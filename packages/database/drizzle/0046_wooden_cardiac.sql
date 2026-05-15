CREATE TABLE "stock_balance_initializations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"opening_quantity" integer NOT NULL,
	"source_type" varchar(64) NOT NULL,
	"source_key" varchar(160) NOT NULL,
	"note" varchar(500),
	"initialized_by" uuid,
	"initialized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_balance_initializations_opening_quantity_nonnegative" CHECK ("stock_balance_initializations"."opening_quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "stock_balance_initializations" ADD CONSTRAINT "stock_balance_initializations_sku_id_product_variants_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance_initializations" ADD CONSTRAINT "stock_balance_initializations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance_initializations" ADD CONSTRAINT "stock_balance_initializations_initialized_by_users_id_fk" FOREIGN KEY ("initialized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_balance_initializations_sku_location_unique" ON "stock_balance_initializations" USING btree ("sku_id","location_id");--> statement-breakpoint
CREATE INDEX "stock_balance_initializations_location_idx" ON "stock_balance_initializations" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "stock_balance_initializations_initialized_at_idx" ON "stock_balance_initializations" USING btree ("initialized_at");