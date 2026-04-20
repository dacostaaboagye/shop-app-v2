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
  assert.equal(values.baseCurrencyCode, "GHS");
});

test("maps form values into a normalized settings payload", () => {
  const payload = toOfficialDocumentSettingsPayload({
    ...toOfficialDocumentSettingsFormValues(settings),
    baseCurrencyCode: "ghs",
    defaultDisplayCurrencyCode: "usd",
  });

  assert.equal(payload.currency?.baseCurrencyCode, "GHS");
  assert.equal(payload.currency?.defaultDisplayCurrencyCode, "USD");
});
