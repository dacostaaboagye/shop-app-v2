CREATE TABLE "catalog_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"website" varchar(500),
	"status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_brands_slug_unique" UNIQUE("slug"),
	CONSTRAINT "catalog_brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "catalog_products" ADD COLUMN "brand_id" uuid;--> statement-breakpoint
ALTER TABLE "catalog_products" ADD COLUMN "country_of_origin" varchar(2);--> statement-breakpoint
ALTER TABLE "catalog_products" ADD COLUMN "is_taxable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_products" ADD COLUMN "tax_category" varchar(80);--> statement-breakpoint
ALTER TABLE "catalog_products" ADD COLUMN "price_includes_tax" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "weight_grams" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "dimensions_cm" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "packaging_type" varchar(80);--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "manufacturer_part_number" varchar(80);--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "customs_code" varchar(80);--> statement-breakpoint
ALTER TABLE "catalog_brands" ADD CONSTRAINT "catalog_brands_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_brands_status_idx" ON "catalog_brands" USING btree ("status");--> statement-breakpoint
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_brand_id_catalog_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."catalog_brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_products_brand_idx" ON "catalog_products" USING btree ("brand_id");