import assert from "node:assert/strict";
import test from "node:test";
import {
  toOfficialDocumentSettingsFormValues,
  toOfficialDocumentSettingsPayload,
} from "./official-document-settings-form.support";

const settings = {
  brand: {
    accentColor: "hsl(28 72% 48%)",
    brandName: "Shop App",
    logoImageUrl: "https://cdn.example.com/logo.png",
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
    baseCurrencyCode: "GHS",
    currencyScale: 2,
    defaultDisplayCurrencyCode: "GHS",
    roundingMode: "half_up" as const,
  },
  documents: {
    defaultPaperSize: "receipt_80mm" as const,
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
};

test("maps official document settings into editable form values", () => {
  const values = toOfficialDocumentSettingsFormValues(settings);

  assert.equal(values.brandName, "Shop App");
  assert.equal(values.registrationNumber, "REGISTRATION-PENDING");
  assert.equal(values.addressLines, "Primary business location");
  assert.equal(values.primaryColor, "hsl(174 52% 23%)");
  assert.equal(values.accentColor, "hsl(28 72% 48%)");
  assert.equal(values.baseCurrencyCode, "GHS");
  assert.equal(values.roundingMode, "half_up");
  assert.equal(values.receiptPrefix, "RCT");
  assert.equal(
    values.supplierInviteSubject,
    "Supplier portal invitation for {{supplierName}}",
  );
});

test("maps form values into a normalized settings payload", () => {
  const payload = toOfficialDocumentSettingsPayload({
    ...toOfficialDocumentSettingsFormValues(settings),
    addressLines: "Airport Road\nAccra",
    baseCurrencyCode: "ghs",
    defaultDisplayCurrencyCode: "usd",
  });

  assert.deepEqual(payload.business?.addressLines, ["Airport Road", "Accra"]);
  assert.equal(payload.currency?.baseCurrencyCode, "GHS");
  assert.equal(payload.currency?.defaultDisplayCurrencyCode, "USD");
  assert.equal(payload.currency?.roundingMode, "half_up");
  assert.equal(payload.documents?.receiptPrefix, "RCT");
  assert.equal(
    payload.emailTemplates?.supplierInvite?.subject,
    "Supplier portal invitation for {{supplierName}}",
  );
  assert.equal(payload.brand?.primaryColor, "hsl(174 52% 23%)");
  assert.equal(payload.brand?.accentColor, "hsl(28 72% 48%)");
  assert.equal(payload.locationOverridePolicy?.allowLocationDisplayName, true);
});
