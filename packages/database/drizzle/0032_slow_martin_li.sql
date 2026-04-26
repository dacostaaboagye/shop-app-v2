DO $$ BEGIN
  CREATE TYPE "public"."stock_transfer_event_type" AS ENUM('requested', 'approved', 'dispatched', 'received', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."stock_transfer_status" AS ENUM('requested', 'approved', 'in_transit', 'received', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_transfer_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"supply_request_id" uuid NOT NULL,
	"event_type" "stock_transfer_event_type" NOT NULL,
	"actor_user_id" uuid,
	"summary" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(25) NOT NULL,
	"supply_request_id" uuid NOT NULL,
	"source_location_id" uuid NOT NULL,
	"destination_location_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"sku_snapshot" jsonb NOT NULL,
	"requested_quantity" integer NOT NULL,
	"approved_quantity" integer,
	"status" "stock_transfer_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_event_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_events" ADD CONSTRAINT "stock_transfer_events_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_events" ADD CONSTRAINT "stock_transfer_events_supply_request_id_stock_supply_requests_id_fk" FOREIGN KEY ("supply_request_id") REFERENCES "public"."stock_supply_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_events" ADD CONSTRAINT "stock_transfer_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_supply_request_id_stock_supply_requests_id_fk" FOREIGN KEY ("supply_request_id") REFERENCES "public"."stock_supply_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_source_location_id_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_sku_id_product_variants_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_transfer_events_transfer_idx" ON "stock_transfer_events" USING btree ("transfer_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_transfer_events_type_idx" ON "stock_transfer_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_transfer_events_supply_request_idx" ON "stock_transfer_events" USING btree ("supply_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_transfers_reference_unique" ON "stock_transfers" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_transfers_supply_request_unique" ON "stock_transfers" USING btree ("supply_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_transfers_status_idx" ON "stock_transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_transfers_source_location_idx" ON "stock_transfers" USING btree ("source_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_transfers_destination_location_idx" ON "stock_transfers" USING btree ("destination_location_id");
