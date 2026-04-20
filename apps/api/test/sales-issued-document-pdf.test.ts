import assert from "node:assert/strict";
import test from "node:test";
import type { IssuedDocumentSnapshotResponse } from "@shop/contracts";
import { toSalesIssuedDocumentPdfFile } from "../src/modules/official-documents/sales-issued-document-pdf.js";

const snapshot: IssuedDocumentSnapshotResponse = {
  contentHash: "sha256:test",
  documentReference: "INV/2026/000001",
  documentType: "sales_receipt",
  issuedAt: "2026-04-20T10:00:00.000Z",
  locationId: "22222222-2222-4222-8222-222222222222",
  payloadSnapshot: {
    attributedWorkerEmail: null,
    attributedWorkerId: null,
    attributedWorkerName: null,
    confirmedAt: "2026-04-20T10:00:00.000Z",
    createdAt: "2026-04-20T09:59:00.000Z",
    lines: [
      {
        lineTotal: "24.00",
        quantity: 2,
        skuId: "66666666-6666-4666-8666-666666666666",
        skuSnapshot: {
          productName: "Canvas Tote",
          sku: "BAG-001",
          variantName: "Natural",
        },
        stockMovementId: null,
        taxAmount: "0.00",
        taxCategory: null,
        taxRate: null,
        unitPrice: "12.00",
      },
    ],
    locationId: "22222222-2222-4222-8222-222222222222",
    notes: "Customer requested email copy.",
    paymentMethod: "cash",
    reference: "INV/2026/000001",
    status: "confirmed",
    subtotalAmount: "24.00",
    taxAmount: "0.00",
    totalAmount: "24.00",
    type: "pos",
  },
  profileSnapshot: {
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
};

test("renders an issued sales snapshot as an official PDF file", async () => {
  const file = await toSalesIssuedDocumentPdfFile(snapshot);

  assert.equal(file.contentType, "application/pdf");
  assert.equal(file.filename, "INV-2026-000001.pdf");
  assert.equal(file.body.subarray(0, 4).toString("utf8"), "%PDF");
  assert.ok(file.body.length > 1_000);
});
