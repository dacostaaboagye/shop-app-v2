ALTER TABLE "official_document_settings" ADD COLUMN "email_templates" jsonb;
UPDATE "official_document_settings"
SET "email_templates" = '{
  "emailVerification": {
    "actionLabel": "Verify email address",
    "footer": "This link expires in 24 hours. If you did not create an account, you can safely ignore this email.",
    "heading": "Verify your email",
    "intro": "Hi {{firstName}}, please verify your email address to unlock full access to your account.",
    "subject": "Verify your email address"
  },
  "passwordReset": {
    "actionLabel": "Reset password",
    "footer": "This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.",
    "heading": "Reset your password",
    "intro": "Hi {{firstName}}, we received a request to reset your password.",
    "subject": "Reset your password"
  },
  "supplierInvite": {
    "actionLabel": "Set up portal access",
    "footer": "This link expires in 1 hour. If you were not expecting this invite, contact the business before continuing.",
    "heading": "Supplier portal access",
    "intro": "Hi {{firstName}}, you have been invited to manage supplier activity for {{supplierName}}.",
    "subject": "Supplier portal invitation for {{supplierName}}"
  }
}'::jsonb
WHERE "email_templates" IS NULL;
ALTER TABLE "official_document_settings" ALTER COLUMN "email_templates" SET NOT NULL;
