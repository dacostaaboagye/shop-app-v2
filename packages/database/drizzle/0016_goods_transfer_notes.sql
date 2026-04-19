-- Goods Transfer Notes (GTN): legal documents recording internal stock transfers
-- Created on dispatch, confirmed on receipt
-- Migration 0016

CREATE TABLE "goods_transfer_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(25) NOT NULL,

  -- Linked supply request
  "supply_request_id" uuid NOT NULL,

  -- Transfer parties
  "source_location_id" uuid NOT NULL,
  "destination_location_id" uuid NOT NULL,

  -- Goods details
  "sku_id" uuid NOT NULL,
  "sku_snapshot" jsonb NOT NULL,
  "quantity" integer NOT NULL,

  -- Document lifecycle: draft → dispatched → received
  "status" varchar(20) DEFAULT 'dispatched' NOT NULL,

  -- Who dispatched and when
  "dispatched_by" uuid NOT NULL,
  "dispatched_at" timestamp with time zone NOT NULL,

  -- Who confirmed receipt and when (set when status → received)
  "received_by" uuid,
  "received_at" timestamp with time zone,

  "notes" text,

  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "gtn_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "gtn_status_check" CHECK (
    "status" IN ('dispatched', 'received', 'cancelled')
  )
);
--> statement-breakpoint

ALTER TABLE "goods_transfer_notes"
  ADD CONSTRAINT "gtn_supply_request_id_fk"
  FOREIGN KEY ("supply_request_id") REFERENCES "public"."stock_supply_requests"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "goods_transfer_notes"
  ADD CONSTRAINT "gtn_source_location_id_fk"
  FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "goods_transfer_notes"
  ADD CONSTRAINT "gtn_destination_location_id_fk"
  FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "goods_transfer_notes"
  ADD CONSTRAINT "gtn_sku_id_fk"
  FOREIGN KEY ("sku_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "goods_transfer_notes"
  ADD CONSTRAINT "gtn_dispatched_by_fk"
  FOREIGN KEY ("dispatched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "goods_transfer_notes"
  ADD CONSTRAINT "gtn_received_by_fk"
  FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "gtn_reference_unique" ON "goods_transfer_notes" USING btree ("reference");
--> statement-breakpoint
CREATE UNIQUE INDEX "gtn_supply_request_unique" ON "goods_transfer_notes" USING btree ("supply_request_id");
--> statement-breakpoint
CREATE INDEX "gtn_source_location_idx" ON "goods_transfer_notes" USING btree ("source_location_id");
--> statement-breakpoint
CREATE INDEX "gtn_destination_location_idx" ON "goods_transfer_notes" USING btree ("destination_location_id");
--> statement-breakpoint
CREATE INDEX "gtn_status_idx" ON "goods_transfer_notes" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "gtn_dispatched_at_idx" ON "goods_transfer_notes" USING btree ("dispatched_at");
--> statement-breakpoint

INSERT INTO sequence_counters (sequence_key, current_value, description)
VALUES ('gtn', 0, 'Goods Transfer Note counter — generates GTN-XXXXX references')
ON CONFLICT (sequence_key) DO NOTHING;
