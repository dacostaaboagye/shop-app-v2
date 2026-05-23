import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReferenceSequenceKey } from "../src/modules/public-identifiers/reference-number-formats.js";
import { ManualInvoiceRequestService } from "../src/modules/sales/manual-invoice-request.service.js";
import type {
  ManualInvoiceRequestRecord,
  ManualInvoiceRequestRepository,
} from "../src/modules/sales/manual-invoice-request.types.js";
import type { InvoiceWithLines } from "../src/modules/sales/sales.contracts.js";

const REQUESTER_ID = "11111111-1111-4111-8111-111111111111";
const APPROVER_ID = "22222222-2222-4222-8222-222222222222";
const LOCATION_ID = "33333333-3333-4333-8333-333333333333";

describe("ManualInvoiceRequestService", () => {
  it("creates a pending request with a request reference, not an invoice reference", async () => {
    const reservedSequences: ReferenceSequenceKey[] = [];
    const createdInput: {
      value:
        | Parameters<
            ManualInvoiceRequestRepository["createRequestTransaction"]
          >[0]
        | null;
    } = { value: null };
    const service = createService({
      repository: {
        async createRequestTransaction(input) {
          createdInput.value = input;
          return request({
            reference: input.reference,
            subtotalAmount: input.subtotalAmount,
            totalAmount: input.totalAmount,
          });
        },
      },
      async generateReference(input) {
        reservedSequences.push(input.sequenceKey);
        return input.sequenceKey === "manual-invoice-request"
          ? "MIR-00001"
          : "INV-MAN-00001";
      },
    });

    const result = await service.createRequest({
      createdBy: REQUESTER_ID,
      customerName: "Adwoa Mensah",
      lines: [{ quantity: 2, skuId: "sku-1", unitPrice: "10" }],
      locationId: LOCATION_ID,
      reason: "Customer needs replacement receipt",
    });

    assert.deepEqual(reservedSequences, ["manual-invoice-request"]);
    assert.equal(result.reference, "MIR-00001");
    assert.equal(result.approvedInvoiceReference, null);
    assert.ok(createdInput.value);
    assert.equal(createdInput.value.totalAmount, "20.00");
  });

  it("approves a pending request by issuing an official manual invoice", async () => {
    const approvedInput: {
      value:
        | Parameters<
            ManualInvoiceRequestRepository["approveRequestTransaction"]
          >[0]
        | null;
    } = { value: null };
    const service = createService({
      repository: {
        async approveRequestTransaction(input) {
          approvedInput.value = input;
          return {
            invoice: invoice({ reference: input.invoice.reference }),
            request: request({
              approvedBy: input.approvedBy,
              approvedInvoiceReference: input.invoice.reference,
              status: "approved",
            }),
          };
        },
        async findByReference() {
          return request();
        },
      },
      async generateReference(input) {
        return input.sequenceKey === "invoice-manual"
          ? "INV-MAN-00001"
          : "MIR-00001";
      },
    });

    const result = await service.approveRequest({
      actorUserId: APPROVER_ID,
      note: "Approved",
      reference: "MIR-00001",
    });

    assert.ok(approvedInput.value);
    assert.equal(approvedInput.value.invoice.channel, "manual");
    assert.equal(approvedInput.value.invoice.reference, "INV-MAN-00001");
    assert.equal(
      approvedInput.value.invoice.lineItems[0]?.skuSnapshot.sku,
      "BW-L",
    );
    assert.equal(result.invoice.type, "manual");
    assert.equal(result.request.approvedInvoiceReference, "INV-MAN-00001");
  });

  it("prevents requester self approval", async () => {
    const service = createService({
      repository: {
        async approveRequestTransaction() {
          throw new Error("Approval transaction should not run.");
        },
        async findByReference() {
          return request({ requestedBy: REQUESTER_ID });
        },
      },
    });

    await assert.rejects(
      () =>
        service.approveRequest({
          actorUserId: REQUESTER_ID,
          reference: "MIR-00001",
        }),
      /Manual invoice requests must be approved by another user/,
    );
  });
});

function createService(
  input: {
    generateReference?: (input: {
      now?: Date;
      sequenceKey: ReferenceSequenceKey;
    }) => Promise<string>;
    repository?: Partial<ManualInvoiceRequestRepository>;
  } = {},
) {
  const repository: ManualInvoiceRequestRepository = {
    async approveRequestTransaction() {
      return { invoice: invoice(), request: request({ status: "approved" }) };
    },
    async createRequestTransaction(args) {
      return request({ reference: args.reference });
    },
    async findByReference() {
      return request();
    },
    async listByLocations() {
      return { items: [request()], total: 1 };
    },
    async rejectRequestTransaction(args) {
      return request({ rejectedBy: args.actorId, status: "rejected" });
    },
    ...input.repository,
  };

  return new ManualInvoiceRequestService({
    catalogVariantRepository: {
      async getVariantsForSale() {
        return new Map([
          [
            "sku-1",
            {
              isTaxable: false,
              name: "Large",
              productName: "Bottled Water",
              productSlug: "bottled-water",
              sellingPrice: "12.50",
              sku: "BW-L",
              slug: "large",
              taxCategory: null,
            },
          ],
        ]);
      },
    },
    currencyResolver: {
      async resolveCurrencySnapshot() {
        return { currencyCode: "GHS", currencyScale: 2 };
      },
    },
    referenceNumberService: {
      async generateReference(args) {
        return input.generateReference
          ? input.generateReference(args)
          : `REF-${args.sequenceKey}`;
      },
    },
    repository,
  });
}

function request(
  overrides: Partial<ManualInvoiceRequestRecord> = {},
): ManualInvoiceRequestRecord {
  const now = new Date("2026-05-23T10:00:00.000Z");
  return {
    approvedAt: null,
    approvedBy: null,
    approvedByName: null,
    approvedInvoiceId: null,
    approvedInvoiceReference: null,
    createdAt: now,
    currencyCode: "GHS",
    currencyScale: 2,
    customerBillingAddressLines: null,
    customerEmail: null,
    customerName: "Adwoa Mensah",
    customerPhone: null,
    customerTaxNumber: null,
    id: "request-1",
    lines: [
      {
        lineTotal: "12.50",
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
        unitPrice: "12.50",
      },
    ],
    locationId: LOCATION_ID,
    locationName: "East Legon",
    paymentMethod: null,
    reason: "Customer needs replacement receipt",
    reference: "MIR-00001",
    rejectedAt: null,
    rejectedBy: null,
    rejectedByName: null,
    rejectionReason: null,
    requestedBy: REQUESTER_ID,
    requestedByName: "Requester",
    status: "pending",
    subtotalAmount: "12.50",
    supportingNote: null,
    taxAmount: "0.00",
    totalAmount: "12.50",
    updatedAt: now,
    ...overrides,
  };
}

function invoice(overrides: Partial<InvoiceWithLines> = {}): InvoiceWithLines {
  const now = new Date("2026-05-23T10:00:00.000Z");
  return {
    attributedWorkerEmail: null,
    attributedWorkerId: null,
    attributedWorkerName: null,
    classification: "outgoing",
    confirmedAt: now,
    createdAt: now,
    createdBy: APPROVER_ID,
    currencyCode: "GHS",
    currencyScale: 2,
    currentPayableReference: "INV-MAN-00001",
    customerBillingAddressLines: null,
    customerEmail: null,
    customerName: "Adwoa Mensah",
    customerPhone: null,
    customerTaxNumber: null,
    id: "invoice-1",
    lines: [],
    locationId: LOCATION_ID,
    notes: null,
    parentInvoiceId: null,
    parentInvoiceReference: null,
    paymentMethod: null,
    reference: "INV-MAN-00001",
    replacementInvoiceId: null,
    replacementInvoiceReference: null,
    revisionCreditNoteId: null,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: null,
    revisionRootReference: null,
    role: "standard",
    status: "confirmed",
    subtotalAmount: "12.50",
    taxAmount: "0.00",
    totalAmount: "12.50",
    type: "manual",
    updatedAt: now,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}
