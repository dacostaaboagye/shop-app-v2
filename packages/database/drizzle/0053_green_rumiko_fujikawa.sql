CREATE TYPE "public"."customer_address_type" AS ENUM('billing', 'shipping', 'both');--> statement-breakpoint
CREATE TYPE "public"."customer_contact_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."customer_event_type" AS ENUM('customer_created', 'customer_updated', 'contact_added', 'address_added', 'note_added');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('active', 'inactive', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'business');--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(25) NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" varchar(120) NOT NULL,
	"type" "customer_address_type" NOT NULL,
	"recipient_name" varchar(180),
	"recipient_phone" varchar(80),
	"address_lines" jsonb NOT NULL,
	"city" varchar(120),
	"region" varchar(120),
	"country_code" varchar(2),
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"is_default_shipping" boolean DEFAULT false NOT NULL,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_addresses_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "customer_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(25) NOT NULL,
	"customer_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(180) NOT NULL,
	"email" varchar(320),
	"phone" varchar(80),
	"role_title" varchar(160),
	"is_primary" boolean DEFAULT false NOT NULL,
	"receives_invoices" boolean DEFAULT false NOT NULL,
	"receives_delivery_updates" boolean DEFAULT false NOT NULL,
	"status" "customer_contact_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_contacts_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "customer_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"event_type" "customer_event_type" NOT NULL,
	"actor_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(25) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"display_name" varchar(180) NOT NULL,
	"legal_name" varchar(220),
	"customer_type" "customer_type" DEFAULT 'business' NOT NULL,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"tax_number" varchar(120),
	"default_currency_code" varchar(3),
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"credit_limit_amount" numeric(12, 2),
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_reference_unique" UNIQUE("reference"),
	CONSTRAINT "customers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_events" ADD CONSTRAINT "customer_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_events" ADD CONSTRAINT "customer_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_default_billing_unique" ON "customer_addresses" USING btree ("customer_id") WHERE "customer_addresses"."is_default_billing" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_default_shipping_unique" ON "customer_addresses" USING btree ("customer_id") WHERE "customer_addresses"."is_default_shipping" = true;--> statement-breakpoint
CREATE INDEX "customer_contacts_customer_idx" ON "customer_contacts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_contacts_user_idx" ON "customer_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_contacts_primary_unique" ON "customer_contacts" USING btree ("customer_id") WHERE "customer_contacts"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "customer_events_customer_idx" ON "customer_events" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_events_occurred_at_idx" ON "customer_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "customers_reference_idx" ON "customers" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_display_name_unique" ON "customers" USING btree ("display_name");