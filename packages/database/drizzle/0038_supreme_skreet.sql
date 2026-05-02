CREATE TYPE "public"."delivery_source_type" AS ENUM('pos_sale', 'online_order', 'transfer');--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_items" ALTER COLUMN "item_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "source_type" "delivery_source_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "source_reference" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "destination_kind" varchar(16) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_source_unique" ON "deliveries" USING btree ("source_type","source_reference");--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_destination_kind_consistent" CHECK ((
        ("deliveries"."destination_kind" = 'location' AND "deliveries"."destination_location_id" IS NOT NULL)
        OR
        ("deliveries"."destination_kind" = 'external' AND "deliveries"."destination_location_id" IS NULL AND "deliveries"."destination_snapshot" IS NOT NULL)
      ));--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_origin_destination_distinct" CHECK ("deliveries"."destination_location_id" IS NULL OR "deliveries"."destination_location_id" <> "deliveries"."origin_location_id");