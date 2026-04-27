ALTER TABLE "invoices" ADD COLUMN "currency_code" varchar(3) DEFAULT 'GHS';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "currency_scale" integer DEFAULT 2;--> statement-breakpoint
UPDATE "invoices"
SET
  "currency_code" = COALESCE("currency_code", 'GHS'),
  "currency_scale" = COALESCE("currency_scale", 2)
WHERE "currency_code" IS NULL OR "currency_scale" IS NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency_scale" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_currency_scale_range" CHECK ("invoices"."currency_scale" >= 0 and "invoices"."currency_scale" <= 4);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency_code" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency_scale" DROP DEFAULT;
