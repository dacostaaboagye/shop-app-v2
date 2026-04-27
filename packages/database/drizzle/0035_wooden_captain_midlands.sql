ALTER TABLE "users" ADD COLUMN "notification_email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_in_app_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_sound_enabled" boolean DEFAULT true NOT NULL;