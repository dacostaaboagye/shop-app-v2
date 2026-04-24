CREATE TABLE "catalog_media_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_slug" varchar(120) NOT NULL,
	"alt_text" varchar(300),
	"position" smallint DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"public_url" varchar(1000) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"media_type" varchar(20) DEFAULT 'image' NOT NULL,
	"file_size_bytes" integer,
	"width_px" integer,
	"height_px" integer,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "catalog_media_assignments" ADD CONSTRAINT "catalog_media_assignments_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_media_assignments" ADD CONSTRAINT "catalog_media_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_media_assignments_entity_idx" ON "catalog_media_assignments" USING btree ("entity_type","entity_slug","position");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_media_assignments_primary_unique" ON "catalog_media_assignments" USING btree ("entity_type","entity_slug") WHERE "catalog_media_assignments"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_media_assignments_asset_entity_unique" ON "catalog_media_assignments" USING btree ("asset_id","entity_type","entity_slug");--> statement-breakpoint
CREATE INDEX "media_assets_type_idx" ON "media_assets" USING btree ("media_type");