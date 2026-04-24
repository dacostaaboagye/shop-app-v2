-- POS Sales: invoices and invoice line items
-- Migration 0014

DO $$ BEGIN
  CREATE TYPE "public"."invoice_type" AS ENUM('pos', 'portal', 'ecommerce', 'manual', 'credit_note');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."invoice_status" AS ENUM('confirmed', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(25) NOT NULL,
  "type" "invoice_type" NOT NULL,
  "location_id" uuid NOT NULL,
  "attributed_worker_id" uuid,
  "created_by" uuid,
  "payment_method" varchar(50),
  "status" "invoice_status" DEFAULT 'confirmed' NOT NULL,
  "subtotal_amount" numeric(12, 2) NOT NULL,
  "tax_amount" numeric(12, 2) NOT NULL,
  "total_amount" numeric(12, 2) NOT NULL,
  "notes" text,
  "confirmed_at" timestamp with time zone,
  "voided_at" timestamp with time zone,
  "void_reason" text,
  "parent_invoice_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invoices_subtotal_nonnegative" CHECK ("subtotal_amount" >= 0),
  CONSTRAINT "invoices_tax_nonnegative" CHECK ("tax_amount" >= 0),
  CONSTRAINT "invoices_total_nonnegative" CHECK ("total_amount" >= 0)
);
--> statement-breakpoint

CREATE TABLE "invoice_line_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "sku_id" uuid NOT NULL,
  "sku_snapshot" jsonb NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price" numeric(12, 2) NOT NULL,
  "tax_category" varchar(80),
  "tax_rate" numeric(5, 4),
  "tax_amount" numeric(12, 2) NOT NULL,
  "line_total" numeric(12, 2) NOT NULL,
  "stock_movement_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invoice_line_items_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "invoice_line_items_unit_price_nonnegative" CHECK ("unit_price" >= 0)
);
--> statement-breakpoint

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_attributed_worker_id_users_id_fk" FOREIGN KEY ("attributed_worker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_sku_id_product_variants_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "invoices_reference_unique" ON "invoices" USING btree ("reference");
--> statement-breakpoint
CREATE INDEX "invoices_location_status_idx" ON "invoices" USING btree ("location_id","status");
--> statement-breakpoint
CREATE INDEX "invoices_worker_idx" ON "invoices" USING btree ("attributed_worker_id");
--> statement-breakpoint
CREATE INDEX "invoices_type_location_idx" ON "invoices" USING btree ("type","location_id");
--> statement-breakpoint
CREATE INDEX "invoices_created_at_idx" ON "invoices" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_idx" ON "invoice_line_items" USING btree ("invoice_id");
--> statement-breakpoint
CREATE INDEX "invoice_line_items_sku_idx" ON "invoice_line_items" USING btree ("sku_id");
--> statement-breakpoint

-- Seed sequence counters for invoice reference generation
INSERT INTO sequence_counters (sequence_key, current_value, description)
VALUES
  ('invoice-pos', 0, 'POS sale invoice counter — generates INV-POS-XXXXX references'),
  ('invoice-manual', 0, 'Manual invoice counter — generates INV-MAN-XXXXX references')
ON CONFLICT (sequence_key) DO NOTHING;
