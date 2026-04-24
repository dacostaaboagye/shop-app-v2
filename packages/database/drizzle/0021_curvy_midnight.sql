CREATE TYPE "public"."official_document_type" AS ENUM('sales_receipt', 'sales_invoice', 'credit_note', 'refund_note', 'goods_transfer_note', 'dispatch_note', 'stock_adjustment', 'stock_count', 'purchase_order', 'supplier_invoice');--> statement-breakpoint
CREATE TABLE "issued_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_reference" varchar(80) NOT NULL,
	"document_type" "official_document_type" NOT NULL,
	"resource_kind" varchar(80) NOT NULL,
	"resource_reference" varchar(120) NOT NULL,
	"location_id" uuid,
	"issued_by" uuid,
	"issued_at" timestamp with time zone NOT NULL,
	"profile_snapshot" jsonb NOT NULL,
	"payload_snapshot" jsonb NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"schema_version" varchar(40) DEFAULT 'official-document-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issued_documents_document_reference_unique" UNIQUE("document_reference")
);
--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issued_documents_resource_type_unique" ON "issued_documents" USING btree ("resource_kind","resource_reference","document_type");--> statement-breakpoint
CREATE INDEX "issued_documents_location_issued_idx" ON "issued_documents" USING btree ("location_id","issued_at");--> statement-breakpoint
CREATE INDEX "issued_documents_resource_idx" ON "issued_documents" USING btree ("resource_kind","resource_reference");