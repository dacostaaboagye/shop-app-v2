ALTER TYPE "public"."invoice_type" ADD VALUE IF NOT EXISTS 'adjusted';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE IF NOT EXISTS 'superseded';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "replacement_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "revision_root_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "revision_credit_note_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_replacement_invoice_id_invoices_id_fk" FOREIGN KEY ("replacement_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_revision_root_invoice_id_invoices_id_fk" FOREIGN KEY ("revision_root_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_revision_credit_note_id_invoices_id_fk" FOREIGN KEY ("revision_credit_note_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
