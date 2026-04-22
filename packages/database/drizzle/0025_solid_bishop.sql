CREATE TYPE "public"."supplier_procurement_status" AS ENUM('draft', 'submitted', 'approved', 'ordered', 'partially_received', 'received', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."supplier_transaction_type" AS ENUM('purchase_order', 'supplier_invoice', 'goods_receipt', 'payment', 'return', 'credit_note');--> statement-breakpoint
CREATE TABLE "supplier_procurement_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"requested_quantity" integer NOT NULL,
	"approved_quantity" integer,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_procurement_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(25) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"destination_location_id" uuid,
	"status" "supplier_procurement_status" DEFAULT 'draft' NOT NULL,
	"requested_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"ordered_at" timestamp with time zone,
	"expected_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_product_code" varchar(120),
	"lead_time_days" integer DEFAULT 0 NOT NULL,
	"minimum_order_quantity" integer DEFAULT 1 NOT NULL,
	"last_cost_price" numeric(12, 2),
	"notes" text,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"transaction_type" "supplier_transaction_type" NOT NULL,
	"reference" varchar(120) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount" numeric(12, 2),
	"currency_code" varchar(3),
	"status" varchar(80),
	"description" text,
	"related_document_type" varchar(80),
	"related_document_reference" varchar(120),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplier_procurement_order_lines" ADD CONSTRAINT "supplier_procurement_order_lines_order_id_supplier_procurement_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_procurement_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_procurement_order_lines" ADD CONSTRAINT "supplier_procurement_order_lines_sku_id_product_variants_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_procurement_orders" ADD CONSTRAINT "supplier_procurement_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_procurement_orders" ADD CONSTRAINT "supplier_procurement_orders_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_procurement_orders" ADD CONSTRAINT "supplier_procurement_orders_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_procurement_orders" ADD CONSTRAINT "supplier_procurement_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_transactions" ADD CONSTRAINT "supplier_transactions_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_transactions" ADD CONSTRAINT "supplier_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "supplier_procurement_order_lines_order_idx" ON "supplier_procurement_order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_procurement_order_lines_order_sku_unique" ON "supplier_procurement_order_lines" USING btree ("order_id","sku_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_procurement_orders_reference_unique" ON "supplier_procurement_orders" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "supplier_procurement_orders_supplier_idx" ON "supplier_procurement_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_procurement_orders_status_idx" ON "supplier_procurement_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "supplier_products_supplier_idx" ON "supplier_products" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_products_product_idx" ON "supplier_products" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_products_supplier_product_unique" ON "supplier_products" USING btree ("supplier_id","product_id");--> statement-breakpoint
CREATE INDEX "supplier_transactions_supplier_idx" ON "supplier_transactions" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_transactions_reference_idx" ON "supplier_transactions" USING btree ("reference");