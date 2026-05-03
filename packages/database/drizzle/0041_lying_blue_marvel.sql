CREATE TYPE "public"."catalog_change_entity_type" AS ENUM('catalog_brand', 'catalog_category', 'catalog_product', 'product_variant', 'catalog_product_option', 'catalog_product_option_value');--> statement-breakpoint
CREATE TYPE "public"."catalog_change_operation" AS ENUM('created', 'updated', 'archived', 'restored', 'deleted');--> statement-breakpoint
CREATE TABLE "catalog_change_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "catalog_change_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_ref" varchar(120) NOT NULL,
	"parent_entity_type" "catalog_change_entity_type",
	"parent_entity_id" uuid,
	"operation" "catalog_change_operation" NOT NULL,
	"changed_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"actor_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_change_log_create_has_after" CHECK ("catalog_change_log"."operation" <> 'created' OR "catalog_change_log"."after" IS NOT NULL),
	CONSTRAINT "catalog_change_log_delete_has_before" CHECK ("catalog_change_log"."operation" <> 'deleted' OR "catalog_change_log"."before" IS NOT NULL),
	CONSTRAINT "catalog_change_log_update_has_both" CHECK ("catalog_change_log"."operation" NOT IN ('updated','archived','restored') OR ("catalog_change_log"."before" IS NOT NULL AND "catalog_change_log"."after" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "catalog_change_log" ADD CONSTRAINT "catalog_change_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_change_log_entity_idx" ON "catalog_change_log" USING btree ("entity_type","entity_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "catalog_change_log_parent_idx" ON "catalog_change_log" USING btree ("parent_entity_type","parent_entity_id","occurred_at" DESC NULLS LAST) WHERE "catalog_change_log"."parent_entity_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "catalog_change_log_actor_idx" ON "catalog_change_log" USING btree ("actor_id","occurred_at" DESC NULLS LAST);