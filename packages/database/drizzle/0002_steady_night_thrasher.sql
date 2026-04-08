DROP INDEX "slug_redirects_old_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "slug_redirects_old_slug_unique" ON "slug_redirects" USING btree ("entity_type","old_slug");--> statement-breakpoint
CREATE INDEX "slug_redirects_entity_uuid_idx" ON "slug_redirects" USING btree ("entity_type","entity_uuid");--> statement-breakpoint
ALTER TABLE "slug_redirects" ADD CONSTRAINT "slug_redirects_old_new_check" CHECK ("slug_redirects"."old_slug" <> "slug_redirects"."new_slug");