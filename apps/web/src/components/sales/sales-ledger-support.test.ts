import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDefaultSalesLedgerDateRange,
  filterSalesLedgerRecords,
  getSalesLedgerPaymentOptions,
  type SalesLedgerRecord,
  summarizeSalesLedger,
} from "./sales-ledger-support";

const RECORDS: SalesLedgerRecord[] = [
  {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: null,
    attributedWorkerName: "Ama Doe",
    classification: "outgoing",
    confirmedAt: "2026-04-27T09:30:00.000Z",
    createdAt: "2026-04-27T09:30:00.000Z",
    currencyCode: "GHS",
    currencyScale: 2,
    customerBillingAddressLines: null,
    customerContactReference: null,
    customerEmail: "buyer@example.com",
    customerName: "Kojo",
    customerPhone: null,
    customerReference: null,
    customerSlug: null,
    customerTaxNumber: null,
    locationId: "10b57c84-8fe3-46ab-9f52-fd73c3bf25b7",
    locationName: "Airport Shop",
    locationSlug: "airport-shop",
    notes: null,
    parentInvoiceReference: null,
    paymentMethod: "cash",
    reference: "INV-POS-00001",
    replacementInvoiceReference: "INV-POS-00003",
    revisionChain: {
      currentPayableReference: "INV-POS-00003",
      isLatestPayable: false,
      replacementInvoiceReference: "INV-POS-00003",
      revisionCreditNoteReference: "CRN-POS-00001",
      revisionRootReference: null,
      sourceInvoiceReference: null,
    },
    role: "standard",
    status: "superseded",
    subtotalAmount: "120.00",
    taxAmount: "0.00",
    totalAmount: "120.00",
    type: "pos",
  },
  {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: null,
    attributedWorkerName: "Ama Doe",
    classification: "outgoing",
    confirmedAt: "2026-04-27T11:45:00.000Z",
    createdAt: "2026-04-27T11:45:00.000Z",
    currencyCode: "GHS",
    currencyScale: 2,
    customerBillingAddressLines: null,
    customerContactReference: null,
    customerEmail: null,
    customerName: null,
    customerPhone: null,
    customerReference: null,
    customerSlug: null,
    customerTaxNumber: null,
    locationId: "10b57c84-8fe3-46ab-9f52-fd73c3bf25b7",
    locationName: "Airport Shop",
    locationSlug: "airport-shop",
    notes: null,
    parentInvoiceReference: "INV-POS-00001",
    paymentMethod: null,
    reference: "CRN-POS-00001",
    replacementInvoiceReference: "INV-POS-00003",
    revisionChain: {
      currentPayableReference: "INV-POS-00003",
      isLatestPayable: false,
      replacementInvoiceReference: "INV-POS-00003",
      revisionCreditNoteReference: null,
      revisionRootReference: "INV-POS-00001",
      sourceInvoiceReference: "INV-POS-00001",
    },
    role: "credit_note",
    status: "confirmed",
    subtotalAmount: "20.00",
    taxAmount: "0.00",
    totalAmount: "20.00",
    type: "credit_note",
  },
  {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: null,
    attributedWorkerName: "Ama Doe",
    classification: "outgoing",
    confirmedAt: "2026-04-27T12:00:00.000Z",
    createdAt: "2026-04-27T12:00:00.000Z",
    currencyCode: "GHS",
    currencyScale: 2,
    customerBillingAddressLines: null,
    customerContactReference: null,
    customerEmail: "buyer@example.com",
    customerName: "Kojo",
    customerPhone: null,
    customerReference: null,
    customerSlug: null,
    customerTaxNumber: null,
    locationId: "10b57c84-8fe3-46ab-9f52-fd73c3bf25b7",
    locationName: "Airport Shop",
    locationSlug: "airport-shop",
    notes: null,
    parentInvoiceReference: "INV-POS-00001",
    paymentMethod: "cash",
    reference: "INV-POS-00003",
    replacementInvoiceReference: null,
    revisionChain: {
      currentPayableReference: "INV-POS-00003",
      isLatestPayable: true,
      replacementInvoiceReference: null,
      revisionCreditNoteReference: "CRN-POS-00001",
      revisionRootReference: "INV-POS-00001",
      sourceInvoiceReference: "INV-POS-00001",
    },
    role: "adjusted",
    status: "confirmed",
    subtotalAmount: "100.00",
    taxAmount: "0.00",
    totalAmount: "100.00",
    type: "adjusted",
  },
  {
    attributedWorkerEmail: "worker2@example.com",
    attributedWorkerId: null,
    attributedWorkerName: "Yaw Mensah",
    classification: "outgoing",
    confirmedAt: "2026-04-26T15:10:00.000Z",
    createdAt: "2026-04-26T15:10:00.000Z",
    currencyCode: "GHS",
    currencyScale: 2,
    customerBillingAddressLines: null,
    customerContactReference: null,
    customerEmail: "group@example.com",
    customerName: "Awo Group",
    customerPhone: null,
    customerReference: null,
    customerSlug: null,
    customerTaxNumber: null,
    locationId: "6e354c93-1d01-4705-b39e-9131b61a7799",
    locationName: "Osu Shop",
    locationSlug: "osu-shop",
    notes: null,
    parentInvoiceReference: null,
    paymentMethod: "mobile_money",
    reference: "INV-POS-00002",
    replacementInvoiceReference: null,
    revisionChain: {
      currentPayableReference: "INV-POS-00002",
      isLatestPayable: true,
      replacementInvoiceReference: null,
      revisionCreditNoteReference: null,
      revisionRootReference: null,
      sourceInvoiceReference: null,
    },
    role: "standard",
    status: "confirmed",
    subtotalAmount: "250.00",
    taxAmount: "0.00",
    totalAmount: "250.00",
    type: "pos",
  },
];

describe("sales ledger support", () => {
  it("creates a 30-day default range", () => {
    assert.deepEqual(
      createDefaultSalesLedgerDateRange(new Date("2026-04-27T00:00:00.000Z")),
      { dateFrom: "2026-03-29", dateTo: "2026-04-27" },
    );
  });

  it("filters by payment method and search text", () => {
    const filtered = filterSalesLedgerRecords(RECORDS, {
      paymentMethod: "mobile_money",
      search: "awo",
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.reference, "INV-POS-00002");
  });

  it("returns sorted payment options from available records", () => {
    assert.deepEqual(getSalesLedgerPaymentOptions(RECORDS), [
      "cash",
      "mobile_money",
    ]);
  });

  it("summarizes daily sales, returns, and net revenue", () => {
    const summary = summarizeSalesLedger(RECORDS);

    assert.equal(summary.transactionCount, 4);
    assert.equal(summary.adjustedInvoiceCount, 1);
    assert.equal(summary.adjustedInvoiceAmount, 100);
    assert.equal(summary.receiptCount, 2);
    assert.equal(summary.creditNoteCount, 1);
    assert.equal(summary.grossSalesAmount, 370);
    assert.equal(summary.creditNoteAmount, 20);
    assert.equal(summary.netRevenueAmount, 350);
    assert.equal(summary.averageReceiptAmount, 185);
    assert.equal(summary.timelineDays.length, 2);
    assert.equal(summary.timelineDays[1]?.adjustedInvoiceAmount, 100);
    assert.equal(summary.timelineDays[1]?.netRevenueAmount, 80);
  });
});
