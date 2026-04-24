-- Stock supply requests: workers request restocking from another location (warehouse or store)
-- Migration 0015

CREATE TABLE "stock_supply_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(25) NOT NULL,

  -- Who requested and where goods should go (destination)
  "requester_id" uuid NOT NULL,
  "location_id" uuid NOT NULL,

  -- Where goods should come from (source)
  "source_location_id" uuid NOT NULL,

  -- What is being requested
  "sku_id" uuid NOT NULL,
  "sku_snapshot" jsonb NOT NULL,
  "requested_quantity" integer NOT NULL,

  -- Status: pending → approved → dispatched → received
  --         pending → rejected
  --         pending | approved → cancelled
  "status" varchar(20) DEFAULT 'pending' NOT NULL,

  -- Requester notes
  "notes" text,

  -- Approval/rejection fields
  "approved_quantity" integer,
  "resolution_notes" text,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,

  -- Dispatch fields (set when goods leave source, stock deducted)
  "dispatched_by" uuid,
  "dispatched_at" timestamp with time zone,

  -- Receipt fields (set when worker confirms receipt, stock added to destination)
  "received_at" timestamp with time zone,

  -- Invoice created on receipt
  "transfer_invoice_id" uuid,

  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "supply_requests_qty_positive" CHECK ("requested_quantity" > 0),
  CONSTRAINT "supply_requests_approved_qty_positive" CHECK ("approved_quantity" IS NULL OR "approved_quantity" > 0),
  CONSTRAINT "supply_requests_status_check" CHECK (
    "status" IN ('pending', 'approved', 'dispatched', 'received', 'rejected', 'cancelled')
  )
);
--> statement-breakpoint

ALTER TABLE "stock_supply_requests"
  ADD CONSTRAINT "supply_requests_requester_id_users_id_fk"
  FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "stock_supply_requests"
  ADD CONSTRAINT "supply_requests_location_id_locations_id_fk"
  FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "stock_supply_requests"
  ADD CONSTRAINT "supply_requests_source_location_id_locations_id_fk"
  FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "stock_supply_requests"
  ADD CONSTRAINT "supply_requests_sku_id_product_variants_id_fk"
  FOREIGN KEY ("sku_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "stock_supply_requests"
  ADD CONSTRAINT "supply_requests_resolved_by_users_id_fk"
  FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "stock_supply_requests"
  ADD CONSTRAINT "supply_requests_dispatched_by_users_id_fk"
  FOREIGN KEY ("dispatched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "supply_requests_reference_unique" ON "stock_supply_requests" USING btree ("reference");
--> statement-breakpoint
CREATE INDEX "supply_requests_requester_idx" ON "stock_supply_requests" USING btree ("requester_id");
--> statement-breakpoint
CREATE INDEX "supply_requests_location_idx" ON "stock_supply_requests" USING btree ("location_id");
--> statement-breakpoint
CREATE INDEX "supply_requests_source_location_idx" ON "stock_supply_requests" USING btree ("source_location_id");
--> statement-breakpoint
CREATE INDEX "supply_requests_status_idx" ON "stock_supply_requests" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "supply_requests_created_at_idx" ON "stock_supply_requests" USING btree ("created_at");
--> statement-breakpoint

INSERT INTO sequence_counters (sequence_key, current_value, description)
VALUES ('supply-request', 0, 'Stock supply request counter — generates SUP-XXXXX references')
ON CONFLICT (sequence_key) DO NOTHING;
