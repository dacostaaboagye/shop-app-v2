import assert from "node:assert/strict";
import test from "node:test";
import type { IssuedDocumentSnapshotResponse } from "@shop/contracts";
import { toSalesDocumentSnapshot } from "./sales-document-snapshot";

const snapshot: IssuedDocumentSnapshotResponse = {
  contentHash: "sha256:test",
  documentReference: "INV/2026/001",
  documentType: "sales_receipt",
  issuedAt: "2026-04-20T10:00:00.000Z",
  locationId: "22222222-2222-4222-8222-222222222222",
  payloadSnapshot: {
    attributedWorkerEmail: null,
    attributedWorkerId: null,
    attributedWorkerName: null,
    confirmedAt: "2026-04-20T10:00:00.000Z",
    createdAt: "2026-04-20T09:59:00.000Z",
    currencyCode: "GHS",
    currencyScale: 2,
    lines: [],
    locationId: "22222222-2222-4222-8222-222222222222",
    notes: null,
    paymentMethod: "cash",
    reference: "INV/2026/001",
    status: "confirmed",
    subtotalAmount: "0.00",
    taxAmount: "0.00",
    totalAmount: "0.00",
    type: "pos",
  },
  profileSnapshot: {
    accentColor: "hsl(28 72% 48%)",
    addressLines: ["Primary business location"],
    brandName: "Shop App",
    currencyCode: "GHS",
    currencyScale: 2,
    documentPrefix: "RCT",
    email: "accounts@example.com",
    footer: "Official document.",
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
  resourceReference: "INV/2026/001",
  schemaVersion: "official-document-v1",
};

test("narrows official sales snapshots to printable invoice payloads", () => {
  const parsed = toSalesDocumentSnapshot(snapshot);

  assert.ok(parsed);
  assert.equal(parsed.payloadSnapshot.reference, "INV/2026/001");
  assert.equal(parsed.profileSnapshot.currencyCode, "GHS");
});

test("rejects malformed sales snapshot payloads", () => {
  const parsed = toSalesDocumentSnapshot({
    ...snapshot,
    payloadSnapshot: { reference: "INV/2026/001" },
  });

  assert.equal(parsed, null);
});
