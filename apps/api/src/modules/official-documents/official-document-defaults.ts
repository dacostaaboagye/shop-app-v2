import type {
  DocumentBrandSettings,
  DocumentBusinessSettings,
  DocumentDefaults,
  LocationOverridePolicy,
  MoneySettings,
} from "@shop/database";

export const OFFICIAL_DOCUMENT_SETTINGS_KEY = "default";

export const defaultBrandSettings: DocumentBrandSettings = {
  accentColor: "hsl(28 72% 48%)",
  brandName: "Shop App",
  logoText: "SA",
  primaryColor: "hsl(174 52% 23%)",
};

export const defaultBusinessSettings: DocumentBusinessSettings = {
  addressLines: ["Primary business location", "Configure official address"],
  email: "accounts@example.com",
  legalName: "Shop App Trading Company",
  phone: "+233 00 000 0000",
  registrationNumber: "REGISTRATION-PENDING",
  taxNumber: "TAX-PENDING",
  website: "www.example.com",
};

export const defaultMoneySettings: MoneySettings = {
  allowExchangeRates: false,
  allowMultiCurrencySales: false,
  baseCurrencyCode: "GHS",
  currencyScale: 2,
  defaultDisplayCurrencyCode: "GHS",
  roundingMode: "half_up",
};

export const defaultDocumentSettings: DocumentDefaults = {
  defaultPaperSize: "receipt_80mm",
  gtnPrefix: "GTN",
  invoicePrefix: "INV",
  locale: "en-GH",
  receiptFooter:
    "Thank you for your business. This official system-generated document is valid without a signature and should be retained for your records. Returns, exchanges, warranty claims, and after-sales support are subject to company policy and must be supported by this document. Please quote the document reference for any enquiry.",
  receiptPrefix: "RCT",
  timezone: "Africa/Accra",
};

export const defaultLocationOverridePolicy: LocationOverridePolicy = {
  allowLocationAddress: true,
  allowLocationContact: true,
  allowLocationDisplayName: true,
  allowLocationFooter: true,
  allowLocationNumberPrefix: false,
  allowLocationPaperSize: true,
};
