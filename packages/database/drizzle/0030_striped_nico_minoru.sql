ALTER TYPE "public"."email_delivery_status" ADD VALUE IF NOT EXISTS 'bounced' BEFORE 'console_fallback';--> statement-breakpoint
ALTER TYPE "public"."email_delivery_status" ADD VALUE IF NOT EXISTS 'complained' BEFORE 'console_fallback';--> statement-breakpoint
ALTER TYPE "public"."email_delivery_status" ADD VALUE IF NOT EXISTS 'delayed' BEFORE 'failed';--> statement-breakpoint
ALTER TYPE "public"."email_delivery_status" ADD VALUE IF NOT EXISTS 'delivered' BEFORE 'failed';--> statement-breakpoint
ALTER TYPE "public"."email_delivery_status" ADD VALUE IF NOT EXISTS 'suppressed';--> statement-breakpoint
CREATE TABLE "email_delivery_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid,
	"provider" varchar(80) NOT NULL,
	"provider_event_id" varchar(160) NOT NULL,
	"provider_event_type" varchar(80) NOT NULL,
	"provider_message_id" varchar(160),
	"status" "email_delivery_status" NOT NULL,
	"status_reason" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_delivery_status_events" ADD CONSTRAINT "email_delivery_status_events_attempt_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."email_delivery_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_delivery_status_events_attempt_idx" ON "email_delivery_status_events" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "email_delivery_status_events_message_idx" ON "email_delivery_status_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "email_delivery_status_events_status_idx" ON "email_delivery_status_events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "email_delivery_status_events_event_unique" ON "email_delivery_status_events" USING btree ("provider_event_id");