CREATE TYPE "public"."invoice_classification" AS ENUM('outgoing', 'internal');--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "classification" "invoice_classification" DEFAULT 'outgoing' NOT NULL;--> statement-breakpoint
