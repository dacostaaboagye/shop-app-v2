CREATE TYPE "public"."catalog_entity_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "catalog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"parent_category_id" uuid,
	"status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category_id" uuid,
	"status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"sku" varchar(80) NOT NULL,
	"barcode" varchar(80),
	"unit_of_measure" varchar(40) NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_cost_price_nonnegative" CHECK ("product_variants"."cost_price" >= 0),
	CONSTRAINT "product_variants_selling_price_nonnegative" CHECK ("product_variants"."selling_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "latitude" numeric(10, 8);--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "longitude" numeric(11, 8);--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "geo_address" text;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_categories_parent_idx" ON "catalog_categories" USING btree ("parent_category_id");--> statement-breakpoint
CREATE INDEX "catalog_categories_status_idx" ON "catalog_categories" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_categories_name_per_parent_unique" ON "catalog_categories" USING btree ("parent_category_id","name");--> statement-breakpoint
CREATE INDEX "catalog_products_category_idx" ON "catalog_products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "catalog_products_status_idx" ON "catalog_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_status_idx" ON "product_variants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_barcode_unique" ON "product_variants" USING btree ("barcode") WHERE "product_variants"."barcode" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_default_per_product_unique" ON "product_variants" USING btree ("product_id") WHERE "product_variants"."is_default" = true;