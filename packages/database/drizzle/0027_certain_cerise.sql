ALTER TABLE "supplier_inquiries" ADD COLUMN "requested_product_name" varchar(200);--> statement-breakpoint
ALTER TABLE "supplier_inquiries" ADD COLUMN "attachment_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "supplier_inquiries" ADD COLUMN "attachment_name" varchar(255);--> statement-breakpoint
ALTER TABLE "supplier_inquiries" ADD COLUMN "attachment_mime_type" varchar(100);