ALTER TABLE "deliveries" ADD COLUMN "assigned_by" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "dispatched_by" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "completed_by" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "cancellation_reason" varchar(240);--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_dispatched_by_users_id_fk" FOREIGN KEY ("dispatched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_cancellation_reason_consistent" CHECK (("deliveries"."status" = 'cancelled') = ("deliveries"."cancellation_reason" IS NOT NULL));