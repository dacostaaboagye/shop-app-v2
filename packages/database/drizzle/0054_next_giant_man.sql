ALTER TABLE "manual_invoice_requests" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "manual_invoice_requests" ADD COLUMN "customer_contact_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_contact_id" uuid;--> statement-breakpoint
ALTER TABLE "manual_invoice_requests" ADD CONSTRAINT "manual_invoice_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_invoice_requests" ADD CONSTRAINT "manual_invoice_requests_customer_contact_id_customer_contacts_id_fk" FOREIGN KEY ("customer_contact_id") REFERENCES "public"."customer_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_contact_id_customer_contacts_id_fk" FOREIGN KEY ("customer_contact_id") REFERENCES "public"."customer_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manual_invoice_requests_customer_idx" ON "manual_invoice_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "manual_invoice_requests_customer_contact_idx" ON "manual_invoice_requests" USING btree ("customer_contact_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_contact_idx" ON "invoices" USING btree ("customer_contact_id");