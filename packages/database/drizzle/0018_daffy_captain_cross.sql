CREATE TYPE "public"."platform_event_delivery_status" AS ENUM('pending', 'processing', 'delivered', 'failed');--> statement-breakpoint
ALTER TABLE "platform_events" ADD COLUMN "delivery_status" "platform_event_delivery_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_events" ADD COLUMN "delivery_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_events" ADD COLUMN "available_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_events" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_events" ADD COLUMN "processing_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_events" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_events" ADD COLUMN "last_error" text;--> statement-breakpoint
CREATE INDEX "platform_events_delivery_idx" ON "platform_events" USING btree ("delivery_status","available_at");--> statement-breakpoint
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_delivery_attempts_nonnegative" CHECK ("platform_events"."delivery_attempts" >= 0);