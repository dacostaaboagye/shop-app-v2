import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSalesDocumentHtml,
  formatDocumentMoney,
  getSalesDocumentFilename,
  getSalesDocumentTitle,
} from "./sales-document";

const invoice = {
  attributedWorkerEmail: null,
  attributedWorkerId: null,
  attributedWorkerName: null,
  confirmedAt: "2026-04-20T10:00:00.000Z",
  createdAt: "2026-04-20T09:59:00.000Z",
  locationId: "22222222-2222-4222-8222-222222222222",
  lines: [
    {
      lineTotal: "24.00",
      quantity: 2,
      skuId: "sku_1",
      skuSnapshot: {
        productName: "Canvas Tote",
        sku: "BAG-001",
        variantName: "Natural",
      },
      taxAmount: "0.00",
      unitPrice: "12.00",
    },
  ],
  notes: "Customer requested email copy.",
  paymentMethod: "mobile_money",
  reference: "INV/2026/001",
  status: "confirmed",
  subtotalAmount: "24.00",
  taxAmount: "0.00",
  totalAmount: "24.00",
  type: "sale",
};

test("formats document money with the configured currency when missing", () => {
  assert.equal(formatDocumentMoney("24.00"), "GHS 24.00");
  assert.equal(formatDocumentMoney("GHS 24.00"), "GHS 24.00");
});

test("builds an official standalone sales document", () => {
  const html = buildSalesDocumentHtml(invoice);

  assert.match(html, /<!doctype html>/);
  assert.match(html, /Shop App/);
  assert.match(html, /Sales Receipt/);
  assert.match(html, /GHS 24\.00/);
  assert.match(html, /Canvas Tote/);
});

test("uses safe filenames for document downloads", () => {
  assert.equal(getSalesDocumentTitle(invoice), "Sales Receipt");
  assert.equal(getSalesDocumentFilename(invoice), "INV-2026-001.html");
});
