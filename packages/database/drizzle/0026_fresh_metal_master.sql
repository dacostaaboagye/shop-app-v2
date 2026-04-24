CREATE TYPE "public"."supplier_inquiry_status" AS ENUM('sent', 'responded', 'converted', 'cancelled');--> statement-breakpoint
CREATE TABLE "supplier_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(25) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"product_id" uuid,
	"status" "supplier_inquiry_status" DEFAULT 'sent' NOT NULL,
	"requested_quantity" integer,
	"needed_by" timestamp with time zone,
	"message" text NOT NULL,
	"supplier_response" text,
	"responded_at" timestamp with time zone,
	"requested_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplier_inquiries" ADD CONSTRAINT "supplier_inquiries_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_inquiries" ADD CONSTRAINT "supplier_inquiries_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_inquiries" ADD CONSTRAINT "supplier_inquiries_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_inquiries_reference_unique" ON "supplier_inquiries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "supplier_inquiries_supplier_idx" ON "supplier_inquiries" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_inquiries_status_idx" ON "supplier_inquiries" USING btree ("status");