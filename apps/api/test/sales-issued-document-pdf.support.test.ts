import assert from "node:assert/strict";
import test from "node:test";
import type {
  InvoiceResponse,
  OfficialDocumentProfileResponse,
} from "@shop/contracts";
import {
  formatMoney,
  getDocumentTitle,
} from "../src/modules/official-documents/sales-issued-document-pdf.support.js";

const PROFILE: OfficialDocumentProfileResponse = {
  accentColor: "hsl(28 72% 48%)",
  addressLines: ["Airport Road"],
  brandName: "Shop App",
  currencyCode: "GHS",
  currencyScale: 2,
  documentPrefix: "RCT",
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
};

test("formats negative credit note amounts with the persisted invoice currency", () => {
  assert.equal(formatMoney("-20.48", PROFILE), "GHS -20.48");
});

test("preserves preformatted money strings without double-prefixing currency", () => {
  assert.equal(formatMoney("GHS -20.48", PROFILE), "GHS -20.48");
});

test("uses credit note as the issued document title for credit note invoices", () => {
  assert.equal(
    getDocumentTitle({
      ...invoice(),
      type: "credit_note",
    }),
    "Credit Note",
  );
});

test("keeps sales receipt as the issued document title for confirmed POS invoices", () => {
  assert.equal(getDocumentTitle(invoice()), "Sales Receipt");
});

function invoice(): InvoiceResponse {
  return {
    attributedWorkerEmail: null,
    attributedWorkerId: null,
    attributedWorkerName: null,
    confirmedAt: "2026-04-20T10:00:00.000Z",
    createdAt: "2026-04-20T09:59:00.000Z",
    customerBillingAddressLines: null,
    currencyCode: "GHS",
    currencyScale: 2,
    customerEmail: null,
    customerName: null,
    customerPhone: null,
    customerTaxNumber: null,
    lines: [],
    locationId: "22222222-2222-4222-8222-222222222222",
    notes: null,
    paymentMethod: "cash",
    reference: "INV/2026/000001",
    status: "confirmed",
    subtotalAmount: "24.00",
    taxAmount: "0.00",
    totalAmount: "24.00",
    type: "pos",
  };
}
