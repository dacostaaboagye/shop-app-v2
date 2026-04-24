CREATE TYPE "public"."email_delivery_status" AS ENUM('console_fallback', 'failed', 'sent');--> statement-breakpoint
CREATE TABLE "email_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_type" varchar(80) NOT NULL,
	"recipient_email" varchar(320) NOT NULL,
	"subject" varchar(240) NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_message_id" varchar(160),
	"status" "email_delivery_status" NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_delivery_attempts_recipient_idx" ON "email_delivery_attempts" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "email_delivery_attempts_status_idx" ON "email_delivery_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_delivery_attempts_type_idx" ON "email_delivery_attempts" USING btree ("message_type");