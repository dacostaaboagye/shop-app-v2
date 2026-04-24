CREATE TYPE "public"."platform_event_audience_kind" AS ENUM('user', 'permission');--> statement-breakpoint
CREATE TYPE "public"."user_notification_status" AS ENUM('unread', 'read');--> statement-breakpoint

CREATE TABLE "platform_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" varchar(120) NOT NULL,
	"summary" text NOT NULL,
	"resource_kind" varchar(80) NOT NULL,
	"resource_reference" varchar(120) NOT NULL,
	"actor_user_slug" varchar(120) NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "platform_event_audiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"audience_kind" "platform_event_audience_kind" NOT NULL,
	"user_id" uuid,
	"permission_key" varchar(120),
	"location_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_event_audiences_shape_check" CHECK ((
        "platform_event_audiences"."audience_kind" = 'user'
        and "platform_event_audiences"."user_id" is not null
        and "platform_event_audiences"."permission_key" is null
      ) or (
        "platform_event_audiences"."audience_kind" = 'permission'
        and "platform_event_audiences"."user_id" is null
        and "platform_event_audiences"."permission_key" is not null
      ))
);
--> statement-breakpoint

CREATE TABLE "user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "user_notification_status" DEFAULT 'unread' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_notifications_read_at_check" CHECK ((
        "user_notifications"."status" = 'unread'
        and "user_notifications"."read_at" is null
      ) or (
        "user_notifications"."status" = 'read'
        and "user_notifications"."read_at" is not null
      ))
);
--> statement-breakpoint

ALTER TABLE "platform_event_audiences" ADD CONSTRAINT "platform_event_audiences_event_id_platform_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."platform_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_event_audiences" ADD CONSTRAINT "platform_event_audiences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_event_audiences" ADD CONSTRAINT "platform_event_audiences_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_event_id_platform_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."platform_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "platform_event_audiences_event_idx" ON "platform_event_audiences" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "platform_event_audiences_user_idx" ON "platform_event_audiences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_event_audiences_permission_idx" ON "platform_event_audiences" USING btree ("permission_key","location_id");--> statement-breakpoint
CREATE INDEX "platform_events_type_idx" ON "platform_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "platform_events_occurred_at_idx" ON "platform_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "platform_events_resource_idx" ON "platform_events" USING btree ("resource_kind","resource_reference");--> statement-breakpoint
CREATE INDEX "user_notifications_user_idx" ON "user_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_notifications_status_idx" ON "user_notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notifications_user_event_unique" ON "user_notifications" USING btree ("user_id","event_id");
