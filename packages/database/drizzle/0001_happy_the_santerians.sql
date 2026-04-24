CREATE TYPE "public"."permission_audit_action" AS ENUM('role_assigned', 'role_revoked', 'override_set', 'override_removed');--> statement-breakpoint
CREATE TYPE "public"."permission_override_effect" AS ENUM('allow', 'deny');--> statement-breakpoint
ALTER TABLE "permission_audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."permission_audit_action" USING "action"::"public"."permission_audit_action";--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ALTER COLUMN "effect" SET DATA TYPE "public"."permission_override_effect" USING "effect"::"public"."permission_override_effect";--> statement-breakpoint
ALTER TABLE "permission_audit_log" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "permission_audit_log" ADD COLUMN "override_effect" "permission_override_effect";--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD COLUMN "removed_by" uuid;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD COLUMN "removed_reason" text;--> statement-breakpoint
ALTER TABLE "permission_audit_log" ADD CONSTRAINT "permission_audit_log_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "permission_audit_log_actor_idx" ON "permission_audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "permission_audit_log_location_idx" ON "permission_audit_log" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_permission_idx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "user_permission_overrides_location_idx" ON "user_permission_overrides" USING btree ("location_id");