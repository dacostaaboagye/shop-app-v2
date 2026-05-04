CREATE TYPE "public"."stock_take_line_status" AS ENUM('catalog_sku', 'manual_blank', 'counted', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."stock_take_mode" AS ENUM('blind', 'assisted');--> statement-breakpoint
CREATE TYPE "public"."stock_take_status" AS ENUM('generated', 'counted', 'reviewed', 'applied', 'cancelled');--> statement-breakpoint
CREATE TABLE "stock_take_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"sku_id" uuid,
	"sku_snapshot" varchar(80) NOT NULL,
	"product_name_snapshot" varchar(200) NOT NULL,
	"product_slug_snapshot" varchar(120),
	"variant_name_snapshot" varchar(160) NOT NULL,
	"variant_slug_snapshot" varchar(120),
	"barcode_snapshot" varchar(80),
	"unit_of_measure_snapshot" varchar(40) NOT NULL,
	"expected_on_hand_snapshot" integer DEFAULT 0 NOT NULL,
	"expected_reserved_snapshot" integer DEFAULT 0 NOT NULL,
	"expected_available_snapshot" integer DEFAULT 0 NOT NULL,
	"counted_quantity" integer,
	"note" varchar(500),
	"applied_delta" integer,
	"row_status" "stock_take_line_status" DEFAULT 'catalog_sku' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_take_lines_line_number_positive" CHECK ("stock_take_lines"."line_number" > 0),
	CONSTRAINT "stock_take_lines_counted_quantity_nonnegative" CHECK ("stock_take_lines"."counted_quantity" IS NULL OR "stock_take_lines"."counted_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_take_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(40) NOT NULL,
	"location_id" uuid NOT NULL,
	"status" "stock_take_status" DEFAULT 'generated' NOT NULL,
	"mode" "stock_take_mode" DEFAULT 'blind' NOT NULL,
	"scope_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_file_name" varchar(180),
	"generated_by" uuid,
	"generated_by_slug" varchar(120),
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_by" uuid,
	"applied_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_take_lines" ADD CONSTRAINT "stock_take_lines_session_id_stock_take_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."stock_take_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_take_lines" ADD CONSTRAINT "stock_take_lines_sku_id_product_variants_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_take_lines_session_line_unique" ON "stock_take_lines" USING btree ("session_id","line_number");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_take_lines_session_sku_unique" ON "stock_take_lines" USING btree ("session_id","sku_id") WHERE "stock_take_lines"."sku_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "stock_take_lines_session_idx" ON "stock_take_lines" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_take_sessions_reference_unique" ON "stock_take_sessions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "stock_take_sessions_location_status_generated_idx" ON "stock_take_sessions" USING btree ("location_id","status","generated_at");
