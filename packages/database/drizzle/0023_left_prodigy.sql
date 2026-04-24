CREATE TYPE "public"."supplier_contact_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "supplier_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"user_id" uuid,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"email" varchar(320),
	"phone" varchar(80),
	"job_title" varchar(160),
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" "supplier_contact_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"legal_name" varchar(220),
	"email" varchar(320),
	"phone" varchar(80),
	"website" varchar(500),
	"tax_id" varchar(120),
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"status" "supplier_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "supplier_contacts_supplier_idx" ON "supplier_contacts" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_contacts_user_idx" ON "supplier_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_contacts_primary_unique" ON "supplier_contacts" USING btree ("supplier_id") WHERE "supplier_contacts"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "suppliers_status_idx" ON "suppliers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_name_unique" ON "suppliers" USING btree ("name");