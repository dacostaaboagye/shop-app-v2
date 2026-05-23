CREATE TYPE "public"."manual_invoice_request_event_action" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."manual_invoice_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "manual_invoice_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"action" "manual_invoice_request_event_action" NOT NULL,
	"actor_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_invoice_request_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"sku_snapshot" jsonb NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"tax_category" varchar(80),
	"tax_rate" numeric(5, 4),
	"tax_amount" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_invoice_request_lines_quantity_positive" CHECK ("manual_invoice_request_lines"."quantity" > 0),
	CONSTRAINT "manual_invoice_request_lines_unit_price_nonnegative" CHECK ("manual_invoice_request_lines"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "manual_invoice_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(25) NOT NULL,
	"location_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "manual_invoice_request_status" DEFAULT 'pending' NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"customer_email" varchar(160),
	"customer_phone" varchar(80),
	"customer_tax_number" varchar(120),
	"customer_billing_address_lines" jsonb,
	"currency_code" varchar(3) NOT NULL,
	"currency_scale" integer NOT NULL,
	"payment_method" varchar(50),
	"subtotal_amount" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"supporting_note" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"approved_invoice_id" uuid,
	"rejected_by" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_invoice_requests_subtotal_nonnegative" CHECK ("manual_invoice_requests"."subtotal_amount" >= 0),
	CONSTRAINT "manual_invoice_requests_tax_nonnegative" CHECK ("manual_invoice_requests"."tax_amount" >= 0),
	CONSTRAINT "manual_invoice_requests_total_nonnegative" CHECK ("manual_invoice_requests"."total_amount" >= 0),
	CONSTRAINT "manual_invoice_requests_pending_state_clean" CHECK ("manual_invoice_requests"."status" <> 'pending' or ("manual_invoice_requests"."approved_by" is null and "manual_invoice_requests"."approved_at" is null and "manual_invoice_requests"."approved_invoice_id" is null and "manual_invoice_requests"."rejected_by" is null and "manual_invoice_requests"."rejected_at" is null and "manual_invoice_requests"."rejection_reason" is null)),
	CONSTRAINT "manual_invoice_requests_approved_state_complete" CHECK ("manual_invoice_requests"."status" <> 'approved' or ("manual_invoice_requests"."approved_by" is not null and "manual_invoice_requests"."approved_at" is not null and "manual_invoice_requests"."approved_invoice_id" is not null)),
	CONSTRAINT "manual_invoice_requests_rejected_state_complete" CHECK ("manual_invoice_requests"."status" <> 'rejected' or ("manual_invoice_requests"."rejected_by" is not null and "manual_invoice_requests"."rejected_at" is not null and "manual_invoice_requests"."rejection_reason" is not null))
);
--> statement-breakpoint
ALTER TABLE "manual_invoice_request_events" ADD CONSTRAINT "manual_invoice_request_events_request_id_manual_invoice_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."manual_invoice_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_request_events" ADD CONSTRAINT "manual_invoice_request_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_request_lines" ADD CONSTRAINT "manual_invoice_request_lines_request_id_manual_invoice_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."manual_invoice_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_request_lines" ADD CONSTRAINT "manual_invoice_request_lines_sku_id_product_variants_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_requests" ADD CONSTRAINT "manual_invoice_requests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_requests" ADD CONSTRAINT "manual_invoice_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_requests" ADD CONSTRAINT "manual_invoice_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_requests" ADD CONSTRAINT "manual_invoice_requests_approved_invoice_id_invoices_id_fk" FOREIGN KEY ("approved_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_requests" ADD CONSTRAINT "manual_invoice_requests_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manual_invoice_request_events_request_idx" ON "manual_invoice_request_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "manual_invoice_request_events_actor_idx" ON "manual_invoice_request_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "manual_invoice_request_lines_request_idx" ON "manual_invoice_request_lines" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "manual_invoice_request_lines_sku_idx" ON "manual_invoice_request_lines" USING btree ("sku_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manual_invoice_requests_reference_unique" ON "manual_invoice_requests" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "manual_invoice_requests_approved_invoice_unique" ON "manual_invoice_requests" USING btree ("approved_invoice_id");--> statement-breakpoint
CREATE INDEX "manual_invoice_requests_location_status_idx" ON "manual_invoice_requests" USING btree ("location_id","status");--> statement-breakpoint
CREATE INDEX "manual_invoice_requests_requested_by_idx" ON "manual_invoice_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "manual_invoice_requests_created_at_idx" ON "manual_invoice_requests" USING btree ("created_at");