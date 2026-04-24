ALTER TABLE "invoices" ADD COLUMN "customer_name" varchar(200);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_email" varchar(160);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_phone" varchar(80);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_tax_number" varchar(120);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_billing_address_lines" jsonb;