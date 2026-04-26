CREATE TABLE IF NOT EXISTS "supplier_portal_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"invited_by" uuid,
	"recipient_email" varchar(320) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"delivery_status" "email_delivery_status" NOT NULL,
	"delivery_reason" varchar(500),
	"email_delivery_attempt_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_portal_invites" ADD CONSTRAINT "supplier_portal_invites_contact_id_supplier_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."supplier_contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_portal_invites" ADD CONSTRAINT "supplier_portal_invites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_portal_invites" ADD CONSTRAINT "supplier_portal_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "supplier_portal_invites" ADD CONSTRAINT "supplier_portal_invites_email_delivery_attempt_id_email_delivery_attempts_id_fk" FOREIGN KEY ("email_delivery_attempt_id") REFERENCES "public"."email_delivery_attempts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_portal_invites_contact_idx" ON "supplier_portal_invites" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_portal_invites_user_idx" ON "supplier_portal_invites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_portal_invites_created_idx" ON "supplier_portal_invites" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_portal_invites_delivery_idx" ON "supplier_portal_invites" USING btree ("delivery_status");
