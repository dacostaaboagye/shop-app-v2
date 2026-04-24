import assert from "node:assert/strict";
import test from "node:test";
import {
  issuedDocumentSnapshotResponseSchema,
  officialDocumentProfileResponseSchema,
  officialDocumentSettingsResponseSchema,
  updateLocationDocumentSettingsRequestSchema,
  updateOfficialDocumentSettingsRequestSchema,
} from "./official-documents.js";

test("official document settings contracts accept production settings", () => {
  const parsed = officialDocumentSettingsResponseSchema.parse({
    brand: {
      accentColor: "hsl(28 72% 48%)",
      brandName: "Shop App",
      logoImageUrl: null,
      logoText: "SA",
      primaryColor: "hsl(174 52% 23%)",
    },
    business: {
      addressLines: ["Primary business location"],
      email: "accounts@example.com",
      legalName: "Shop App Trading Company",
      phone: "+233 00 000 0000",
      registrationNumber: "REGISTRATION-PENDING",
      taxNumber: "TAX-PENDING",
      website: "www.example.com",
    },
    currency: {
      allowExchangeRates: false,
      allowMultiCurrencySales: false,
      baseCurrencyCode: "ghs",
      currencyScale: 2,
      defaultDisplayCurrencyCode: "ghs",
      roundingMode: "half_up",
    },
    documents: {
      defaultPaperSize: "receipt_80mm",
      gtnPrefix: "GTN",
      invoicePrefix: "INV",
      locale: "en-GH",
      receiptFooter: "Official document.",
      receiptPrefix: "RCT",
      timezone: "Africa/Accra",
    },
    emailTemplates: {
      emailVerification: {
        actionLabel: "Verify email address",
        footer: "This link expires in 24 hours.",
        heading: "Verify your email",
        intro: "Hi {{firstName}}, please verify your email address.",
        subject: "Verify your email address",
      },
      passwordReset: {
        actionLabel: "Reset password",
        footer: "This link expires in 1 hour.",
        heading: "Reset your password",
        intro: "Hi {{firstName}}, we received a password reset request.",
        subject: "Reset your password",
      },
      supplierInvite: {
        actionLabel: "Set up portal access",
        footer: "This link expires in 1 hour.",
        heading: "Supplier portal access",
        intro:
          "Hi {{firstName}}, you have been invited to manage {{supplierName}}.",
        subject: "Supplier portal invitation for {{supplierName}}",
      },
    },
    locationOverridePolicy: {
      allowLocationAddress: true,
      allowLocationContact: true,
      allowLocationDisplayName: true,
      allowLocationFooter: true,
      allowLocationNumberPrefix: false,
      allowLocationPaperSize: true,
    },
    updatedAt: null,
    updatedByUserSlug: null,
  });

  assert.equal(parsed.currency.baseCurrencyCode, "GHS");
  assert.equal(parsed.currency.defaultDisplayCurrencyCode, "GHS");
});

test("official document profile contract accepts resolved printable branding", () => {
  const parsed = officialDocumentProfileResponseSchema.parse({
    accentColor: "hsl(28 72% 48%)",
    addressLines: ["Airport Road", "Accra"],
    brandName: "Shop App",
    currencyCode: "ghs",
    currencyScale: 2,
    documentPrefix: "RCT-AIR",
    email: "airport@example.com",
    footer: "Official receipt.",
    legalName: "Shop App Trading Company",
    locale: "en-GH",
    locationId: "22222222-2222-4222-8222-222222222222",
    locationName: "Airport Branch",
    logoImageUrl: null,
    logoText: "SA",
    paperSize: "receipt_80mm",
    phone: "+233 00 000 0000",
    primaryColor: "hsl(174 52% 23%)",
    registrationNumber: "REGISTRATION-PENDING",
    taxNumber: "TAX-PENDING",
    timezone: "Africa/Accra",
    website: "www.example.com",
  });

  assert.equal(parsed.currencyCode, "GHS");
  assert.equal(parsed.locationName, "Airport Branch");
});

test("issued document snapshot contract accepts immutable document evidence", () => {
  const parsed = issuedDocumentSnapshotResponseSchema.parse({
    contentHash: "sha256:abc123",
    documentReference: "RCT/2026/000001",
    documentType: "sales_receipt",
    issuedAt: "2026-04-20T00:00:00.000Z",
    locationId: "22222222-2222-4222-8222-222222222222",
    payloadSnapshot: { reference: "INV/2026/000001", totalAmount: "24.00" },
    profileSnapshot: {
      accentColor: "hsl(28 72% 48%)",
      addressLines: ["Airport Road", "Accra"],
      brandName: "Shop App",
      currencyCode: "GHS",
      currencyScale: 2,
      documentPrefix: "RCT-AIR",
      email: "airport@example.com",
      footer: "Official receipt.",
      legalName: "Shop App Trading Company",
      locale: "en-GH",
      locationId: "22222222-2222-4222-8222-222222222222",
      locationName: "Airport Branch",
      logoImageUrl: null,
      logoText: "SA",
      paperSize: "receipt_80mm",
      phone: "+233 00 000 0000",
      primaryColor: "hsl(174 52% 23%)",
      registrationNumber: "REGISTRATION-PENDING",
      taxNumber: "TAX-PENDING",
      timezone: "Africa/Accra",
      website: "www.example.com",
    },
    resourceKind: "invoice",
    resourceReference: "INV/2026/000001",
    schemaVersion: "official-document-v1",
  });

  assert.equal(parsed.documentType, "sales_receipt");
  assert.equal(parsed.profileSnapshot.currencyCode, "GHS");
});

test("official document update contracts accept partial changes", () => {
  const globalPatch = updateOfficialDocumentSettingsRequestSchema.parse({
    currency: { allowMultiCurrencySales: true },
  });
  const locationPatch = updateLocationDocumentSettingsRequestSchema.parse({
    receiptFooter: "Thank you for visiting Airport Branch.",
  });

  assert.equal(globalPatch.currency?.allowMultiCurrencySales, true);
  assert.equal(
    locationPatch.receiptFooter,
    "Thank you for visiting Airport Branch.",
  );
});

test("official document contracts reject unsupported currency and timezone values", () => {
  assert.throws(() =>
    updateOfficialDocumentSettingsRequestSchema.parse({
      currency: { baseCurrencyCode: "ZZZ" },
    }),
  );
  assert.throws(() =>
    updateOfficialDocumentSettingsRequestSchema.parse({
      documents: { timezone: "Africa/Not-A-Timezone" },
    }),
  );
  assert.throws(() =>
    updateLocationDocumentSettingsRequestSchema.parse({
      timezone: "Branch local time",
    }),
  );
});
