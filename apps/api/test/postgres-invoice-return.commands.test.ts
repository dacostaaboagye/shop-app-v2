import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  invoiceLineItems,
  invoices,
  stockBalances,
  stockMovements,
} from "@shop/database";
import { createReturnTransaction } from "../src/modules/sales/postgres-invoice-return.commands.js";
import type { CreateReturnTransactionInput } from "../src/modules/sales/sales.contracts.js";

const NOW = new Date("2026-04-29T12:00:00.000Z");

describe("createReturnTransaction", () => {
  it("persists coherent revision links across repeated partial returns", async () => {
    const db = new FakeApiDatabase({
      invoiceRows: [
        {
          attributedWorkerId: "worker-1",
          classification: "outgoing",
          confirmedAt: NOW,
          createdBy: "user-1",
          customerBillingAddressLines: ["12 Market Street"],
          currencyCode: "GHS",
          currencyScale: 2,
          customerEmail: "buyer@example.com",
          customerName: "Adwoa Mensah",
          customerPhone: "+233200000000",
          customerTaxNumber: "TIN-123",
          id: "invoice-1",
          locationId: "location-1",
          notes: "Original sale",
          parentInvoiceId: null,
          paymentMethod: "cash",
          reference: "INV-POS-00001",
          replacementInvoiceId: null,
          revisionCreditNoteId: null,
          revisionRootInvoiceId: null,
          status: "confirmed",
          subtotalAmount: "40.00",
          taxAmount: "0.00",
          totalAmount: "40.00",
          type: "pos",
          updatedAt: NOW,
        },
      ],
      stockBalanceRows: [
        {
          locationId: "location-1",
          onHandQuantity: 3,
          skuId: "sku-1",
          updatedAt: NOW,
          updatedBy: "user-1",
        },
      ],
    });

    await createReturnTransaction(
      db as never,
      returnInput({
        adjustedInvoice: {
          lines: [adjustedLine({ lineTotal: "30.00", quantity: 3 })],
          reference: "INV-POS-00002",
          subtotalAmount: "30.00",
          taxAmount: "0.00",
          totalAmount: "30.00",
        },
        lines: [returnLine({ lineTotal: "10.00", quantity: 1 })],
        parentInvoiceId: "invoice-1",
        reference: "CN-POS-00001",
        revisionRootInvoiceId: "invoice-1",
      }),
    );

    const firstAdjustedInvoice = db.findInvoiceByReference("INV-POS-00002");
    assert.ok(firstAdjustedInvoice);

    await createReturnTransaction(
      db as never,
      returnInput({
        adjustedInvoice: {
          lines: [adjustedLine({ lineTotal: "20.00", quantity: 2 })],
          reference: "INV-POS-00003",
          subtotalAmount: "20.00",
          taxAmount: "0.00",
          totalAmount: "20.00",
        },
        lines: [returnLine({ lineTotal: "10.00", quantity: 1 })],
        parentInvoiceId: firstAdjustedInvoice.id,
        reference: "CN-POS-00002",
        revisionRootInvoiceId: "invoice-1",
      }),
    );

    const originalInvoice = db.findInvoiceByReference("INV-POS-00001");
    const firstCreditNote = db.findInvoiceByReference("CN-POS-00001");
    const secondCreditNote = db.findInvoiceByReference("CN-POS-00002");
    const secondAdjustedInvoice = db.findInvoiceByReference("INV-POS-00003");

    assert.ok(originalInvoice);
    assert.ok(firstCreditNote);
    assert.ok(secondCreditNote);
    assert.ok(secondAdjustedInvoice);

    assert.equal(originalInvoice.status, "superseded");
    assert.equal(originalInvoice.replacementInvoiceId, firstAdjustedInvoice.id);

    assert.equal(firstCreditNote.parentInvoiceId, "invoice-1");
    assert.equal(firstCreditNote.replacementInvoiceId, firstAdjustedInvoice.id);
    assert.equal(firstAdjustedInvoice.revisionCreditNoteId, firstCreditNote.id);
    assert.equal(firstAdjustedInvoice.revisionRootInvoiceId, "invoice-1");
    assert.equal(firstAdjustedInvoice.status, "superseded");
    assert.equal(
      firstAdjustedInvoice.replacementInvoiceId,
      secondAdjustedInvoice.id,
    );

    assert.equal(secondCreditNote.parentInvoiceId, firstAdjustedInvoice.id);
    assert.equal(secondCreditNote.revisionRootInvoiceId, "invoice-1");
    assert.equal(secondCreditNote.replacementInvoiceId, secondAdjustedInvoice.id);

    assert.equal(secondAdjustedInvoice.parentInvoiceId, firstAdjustedInvoice.id);
    assert.equal(secondAdjustedInvoice.revisionCreditNoteId, secondCreditNote.id);
    assert.equal(secondAdjustedInvoice.revisionRootInvoiceId, "invoice-1");
    assert.equal(secondAdjustedInvoice.status, "confirmed");

    assert.equal(db.stockMovementsRows.length, 2);
    assert.equal(db.stockBalanceRows[0]?.onHandQuantity, 5);
  });
});

function adjustedLine(
  overrides: Partial<CreateReturnTransactionInput["lines"][number]> = {},
) {
  return {
    lineTotal: "10.00",
    quantity: 1,
    skuId: "sku-1",
    skuSnapshot: {
      productName: "Bottled Water",
      sku: "BW-L",
      variantName: "Large",
    },
    taxAmount: "0.00",
    taxCategory: null,
    taxRate: null,
    unitPrice: "10.00",
    ...overrides,
  };
}

function returnInput(
  overrides: Partial<CreateReturnTransactionInput>,
): CreateReturnTransactionInput {
  return {
    adjustedInvoice: null,
    attributedWorkerId: "worker-1",
    classification: "outgoing",
    confirmedAt: NOW,
    createdBy: "user-1",
    currencyCode: "GHS",
    currencyScale: 2,
    lines: [returnLine()],
    locationId: "location-1",
    now: NOW,
    parentInvoiceId: "invoice-1",
    reference: "CN-POS-00001",
    revisionRootInvoiceId: "invoice-1",
    subtotalAmount: "10.00",
    taxAmount: "0.00",
    totalAmount: "10.00",
    voidReason: "Customer return",
    ...overrides,
  };
}

function returnLine(
  overrides: Partial<CreateReturnTransactionInput["lines"][number]> = {},
) {
  return adjustedLine(overrides);
}

class FakeApiDatabase {
  readonly invoiceLineRows: Array<Record<string, unknown>> = [];
  readonly invoiceRows: Array<Record<string, unknown>>;
  readonly stockBalanceRows: Array<Record<string, unknown>>;
  readonly stockMovementsRows: Array<Record<string, unknown>> = [];

  constructor(input: {
    invoiceRows: Array<Record<string, unknown>>;
    stockBalanceRows: Array<Record<string, unknown>>;
  }) {
    this.invoiceRows = input.invoiceRows;
    this.stockBalanceRows = input.stockBalanceRows;
  }

  async transaction<T>(
    callback: (tx: FakeApiDatabase) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }

  select(selection: Record<string, unknown>) {
    return {
      from: (table: unknown) => ({
        where: async (condition: { value: string }) => {
          if (table !== invoices) {
            return [];
          }

          const invoice = this.invoiceRows.find((row) => row.id === condition.value);
          if (!invoice) {
            return [];
          }

          return [
            Object.fromEntries(
              Object.entries(selection).map(([key]) => [key, invoice[key]]),
            ),
          ];
        },
      }),
    };
  }

  insert(table: unknown) {
    return {
      values: (payload: Record<string, unknown>) => ({
        returning: async (
          returningSelection?: Record<string, unknown>,
        ): Promise<Array<Record<string, unknown>>> => {
          if (table === invoices) {
            const row = {
              createdAt: NOW,
              updatedAt: NOW,
              voidedAt: null,
              voidReason: null,
              ...payload,
              id: `invoice-${this.invoiceRows.length + 1}`,
            };
            this.invoiceRows.push(row);
            return [row];
          }

          if (table === stockMovements) {
            const row = {
              id: `movement-${this.stockMovementsRows.length + 1}`,
              ...payload,
            };
            this.stockMovementsRows.push(row);

            if (returningSelection) {
              return [{ id: row.id }];
            }

            return [row];
          }

          if (table === invoiceLineItems) {
            const row = {
              createdAt: NOW,
              id: `line-${this.invoiceLineRows.length + 1}`,
              updatedAt: NOW,
              ...payload,
            };
            this.invoiceLineRows.push(row);
            return [row];
          }

          throw new Error("Unsupported insert table in test.");
        },
      }),
    };
  }

  update(table: unknown) {
    return {
      set: (changes: Record<string, unknown>) => ({
        where: async (condition: {
          conditions?: Array<{ value?: string }>;
          value?: string;
        }) => {
          if (table === stockBalances) {
            const balance = this.stockBalanceRows[0];
            if (balance) {
              balance.onHandQuantity = Number(balance.onHandQuantity) + 1;
              balance.updatedAt = changes.updatedAt;
              balance.updatedBy = changes.updatedBy;
            }
            return [];
          }

          if (table === invoices) {
            const invoiceId = extractConditionValues(condition).find((value) =>
              this.invoiceRows.some((row) => row.id === value),
            );
            const invoice = this.invoiceRows.find((row) => row.id === invoiceId);
            if (invoice) {
              Object.assign(invoice, normalizeInvoiceChanges(changes, this.invoiceRows));
            }
            return [];
          }

          throw new Error("Unsupported update table in test.");
        },
      }),
    };
  }

  findInvoiceByReference(reference: string) {
    return (
      this.invoiceRows.find((row) => row.reference === reference) as
        | (Record<string, unknown> & {
            id: string;
            parentInvoiceId: string | null;
            reference: string;
            replacementInvoiceId: string | null;
            revisionCreditNoteId: string | null;
            revisionRootInvoiceId: string | null;
            status: string;
          })
        | undefined
    );
  }
}

function normalizeInvoiceChanges(
  changes: Record<string, unknown>,
  invoiceRows: Array<Record<string, unknown>>,
) {
  const nextChanges = { ...changes };
  if (typeof nextChanges.replacementInvoiceId === "string") {
    const replacementInvoice = invoiceRows.find(
      (row) => row.id === nextChanges.replacementInvoiceId,
    );
    nextChanges.replacementInvoiceId = replacementInvoice?.id ?? null;
  }
  return nextChanges;
}

function extractConditionValues(
  input: unknown,
  seen = new Set<object>(),
): string[] {
  if (typeof input === "string") {
    return [input];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => extractConditionValues(item, seen));
  }

  if (input && typeof input === "object") {
    if (seen.has(input)) {
      return [];
    }

    seen.add(input);
    return Object.values(input).flatMap((value) =>
      extractConditionValues(value, seen),
    );
  }

  return [];
}
