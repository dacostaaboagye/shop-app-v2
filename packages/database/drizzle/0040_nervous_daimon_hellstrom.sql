ALTER TABLE "locations" DROP CONSTRAINT "locations_manager_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "locations" DROP COLUMN "manager_id";