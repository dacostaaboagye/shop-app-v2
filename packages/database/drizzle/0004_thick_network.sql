CREATE TYPE "public"."stock_reservation_status" AS ENUM('active', 'confirmed', 'released', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"on_hand_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_balances_on_hand_nonnegative" CHECK ("stock_balances"."on_hand_quantity" >= 0),
	CONSTRAINT "stock_balances_reserved_nonnegative" CHECK ("stock_balances"."reserved_quantity" >= 0),
	CONSTRAINT "stock_balances_reserved_lte_on_hand" CHECK ("stock_balances"."reserved_quantity" <= "stock_balances"."on_hand_quantity")
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "stock_reservation_status" DEFAULT 'active' NOT NULL,
	"source_type" varchar(64) NOT NULL,
	"source_key" varchar(160) NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"confirmed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_reservations_quantity_positive" CHECK ("stock_reservations"."quantity" > 0),
	CONSTRAINT "stock_reservations_expiry_after_create" CHECK ("stock_reservations"."expires_at" IS NULL OR "stock_reservations"."expires_at" >= "stock_reservations"."created_at")
);
--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_balances_sku_location_unique" ON "stock_balances" USING btree ("sku_id","location_id");--> statement-breakpoint
CREATE INDEX "stock_balances_location_idx" ON "stock_balances" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "stock_reservations_sku_location_status_idx" ON "stock_reservations" USING btree ("sku_id","location_id","status");--> statement-breakpoint
CREATE INDEX "stock_reservations_source_idx" ON "stock_reservations" USING btree ("source_type","source_key");--> statement-breakpoint
CREATE INDEX "stock_reservations_expires_at_idx" ON "stock_reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_reservations_active_source_unique" ON "stock_reservations" USING btree ("sku_id","location_id","source_type","source_key") WHERE "stock_reservations"."status" = 'active';