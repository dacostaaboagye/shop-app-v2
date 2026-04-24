ALTER TABLE "product_variants" ADD COLUMN "is_taxable" boolean;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "tax_category" varchar(80);