CREATE TABLE "location_document_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"display_name" varchar(160),
	"address_lines" jsonb,
	"phone" varchar(80),
	"email" varchar(160),
	"receipt_footer" text,
	"default_paper_size" varchar(40),
	"document_prefix" varchar(20),
	"timezone" varchar(80),
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_document_settings_location_id_unique" UNIQUE("location_id")
);
--> statement-breakpoint
CREATE TABLE "official_document_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settings_key" varchar(60) NOT NULL,
	"brand" jsonb NOT NULL,
	"business" jsonb NOT NULL,
	"currency" jsonb NOT NULL,
	"documents" jsonb NOT NULL,
	"location_override_policy" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "official_document_settings_settings_key_unique" UNIQUE("settings_key")
);
--> statement-breakpoint
ALTER TABLE "location_document_settings" ADD CONSTRAINT "location_document_settings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_document_settings" ADD CONSTRAINT "location_document_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_document_settings" ADD CONSTRAINT "official_document_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_document_settings_location_idx" ON "location_document_settings" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "official_document_settings_key_idx" ON "official_document_settings" USING btree ("settings_key");