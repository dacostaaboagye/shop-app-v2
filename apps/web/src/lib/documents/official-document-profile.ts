import type { OfficialDocumentProfileResponse } from "@shop/contracts";

export type OfficialDocumentProfile = OfficialDocumentProfileResponse;

export const DEFAULT_OFFICIAL_DOCUMENT_PROFILE: OfficialDocumentProfile = {
  addressLines: ["Primary business location", "Configure branch address"],
  accentColor: "hsl(28 72% 48%)",
  brandName: "Shop App",
  currencyCode: "GHS",
  currencyScale: 2,
  documentPrefix: null,
  email: "accounts@example.com",
  footer:
    "Thank you for your business. This official system-generated document is valid without a signature and should be retained for your records. Returns, exchanges, warranty claims, and after-sales support are subject to company policy and must be supported by this document. Please quote the document reference for any enquiry.",
  legalName: "Shop App Trading Company",
  locale: "en-GH",
  locationId: null,
  locationName: null,
  logoText: "SA",
  paperSize: "receipt_80mm",
  phone: "+233 00 000 0000",
  primaryColor: "hsl(174 52% 23%)",
  registrationNumber: "REGISTRATION-PENDING",
  taxNumber: "TAX-PENDING",
  timezone: "Africa/Accra",
  website: "www.example.com",
};
