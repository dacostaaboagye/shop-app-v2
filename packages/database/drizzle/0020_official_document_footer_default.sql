UPDATE "official_document_settings"
SET "documents" = jsonb_set(
  "documents",
  '{receiptFooter}',
  to_jsonb('Thank you for your business. This official system-generated document is valid without a signature and should be retained for your records. Returns, exchanges, warranty claims, and after-sales support are subject to company policy and must be supported by this document. Please quote the document reference for any enquiry.'::text),
  true
)
WHERE "documents" ->> 'receiptFooter' = 'Official system-generated document. Keep this copy for your records.';
