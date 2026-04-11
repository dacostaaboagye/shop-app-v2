CREATE TABLE "catalog_product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"value" varchar(80) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_products" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_product_option_values" ADD CONSTRAINT "catalog_product_option_values_option_id_catalog_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."catalog_product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_options" ADD CONSTRAINT "catalog_product_options_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_product_option_values_option_idx" ON "catalog_product_option_values" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_option_values_unique" ON "catalog_product_option_values" USING btree ("option_id","value");--> statement-breakpoint
CREATE INDEX "catalog_product_options_product_idx" ON "catalog_product_options" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_options_name_per_product_unique" ON "catalog_product_options" USING btree ("product_id","name");