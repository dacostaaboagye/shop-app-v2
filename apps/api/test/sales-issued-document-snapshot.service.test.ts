import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OfficialDocumentProfileResponse } from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { PersistedIssuedDocumentSnapshot } from "../src/modules/official-documents/issued-document-snapshot.service.js";
import { IssuedDocumentSnapshotService } from "../src/modules/official-documents/issued-document-snapshot.service.js";
import { SalesIssuedDocumentSnapshotService } from "../src/modules/official-documents/sales-issued-document-snapshot.service.js";
import type { InvoiceWithLines } from "../src/modules/sales/sales.contracts.js";

const NOW = new Date("2026-04-20T10:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "33333333-3333-4333-8333-333333333333";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";

describe("SalesIssuedDocumentSnapshotService", () => {
  it("returns the existing immutable snapshot instead of live settings", async () => {
    const snapshots = new IssuedDocumentSnapshotService(
      new InMemoryIssuedDocumentRepository(),
    );
    let footer = "First official footer.";
    let profileReads = 0;
    const service = createService({
      settingsService: {
        async resolveDocumentProfile() {
          profileReads += 1;
          return profile({ footer });
        },
      },
      snapshotService: snapshots,
    });

    const first = await service.getOrIssueSnapshot({
      actorUserId: USER_ID,
      reference: "INV/2026/000001",
    });
    footer = "Updated footer after issuing.";
    const second = await service.getOrIssueSnapshot({
      actorUserId: USER_ID,
      reference: "INV/2026/000001",
    });

    assert.equal(first.profileSnapshot.footer, "First official footer.");
    assert.equal(second.contentHash, first.contentHash);
    assert.equal(second.profileSnapshot.footer, "First official footer.");
    assert.equal(profileReads, 1);
  });

  it("uses the persisted invoice currency snapshot instead of live settings currency", async () => {
    const service = createService({
      settingsService: {
        async resolveDocumentProfile() {
          return profile({
            currencyCode: "USD",
            currencyScale: 2,
            footer: "Live settings changed after the sale.",
          });
        },
      },
    });

    const snapshot = await service.getOrIssueSnapshot({
      actorUserId: USER_ID,
      reference: "INV/2026/000001",
    });

    assert.equal(snapshot.profileSnapshot.currencyCode, "GHS");
    assert.equal(snapshot.profileSnapshot.currencyScale, 2);
    assert.equal(snapshot.payloadSnapshot.currencyCode, "GHS");
    assert.equal(snapshot.payloadSnapshot.currencyScale, 2);
  });

  it("issues credit note documents with the persisted credit note currency snapshot", async () => {
    const service = createService({
      invoiceRepository: {
        async findByReference(reference) {
          return reference === "CN/2026/000001"
            ? invoice({
                currencyCode: "GHS",
                currencyScale: 2,
                paymentMethod: null,
                reference: "CN/2026/000001",
                subtotalAmount: "20.48",
                taxAmount: "0.00",
                totalAmount: "20.48",
                type: "credit_note",
              })
            : null;
        },
      },
      settingsService: {
        async resolveDocumentProfile(_input = {}) {
          return profile({
            currencyCode: "USD",
            currencyScale: 2,
          });
        },
      },
    });

    const snapshot = await service.getOrIssueSnapshot({
      actorUserId: USER_ID,
      reference: "CN/2026/000001",
    });

    assert.equal(snapshot.documentType, "credit_note");
    assert.equal(snapshot.documentReference, "CN/2026/000001");
    assert.equal(snapshot.profileSnapshot.currencyCode, "GHS");
    assert.equal(snapshot.profileSnapshot.currencyScale, 2);
    assert.equal(snapshot.payloadSnapshot.currencyCode, "GHS");
    assert.equal(snapshot.payloadSnapshot.currencyScale, 2);
    assert.equal(snapshot.payloadSnapshot.totalAmount, "20.48");
  });

  it("allows the attributed worker to issue their own official sales document", async () => {
    const permissionCalls: string[] = [];
    const service = createService({
      permissionService: {
        async assertHasPermission(input) {
          permissionCalls.push(input.permission);
          if (input.permission === "pos.sales.manage") throw forbidden();
        },
      },
    });

    const snapshot = await service.getOrIssueSnapshot({
      actorUserId: USER_ID,
      reference: "INV/2026/000001",
    });

    assert.equal(snapshot.documentType, "sales_receipt");
    assert.equal(snapshot.resourceReference, "INV/2026/000001");
    assert.deepEqual(permissionCalls, ["pos.sales.manage", "pos.sales.view"]);
  });

  it("rejects workers who do not own the sale document", async () => {
    const permissionCalls: string[] = [];
    const service = createService({
      permissionService: {
        async assertHasPermission(input) {
          permissionCalls.push(input.permission);
          throw forbidden();
        },
      },
    });

    await assert.rejects(
      () =>
        service.getOrIssueSnapshot({
          actorUserId: OTHER_USER_ID,
          reference: "INV/2026/000001",
        }),
      /permission to access this official sales document/,
    );
    assert.deepEqual(permissionCalls, ["pos.sales.manage"]);
  });

  it("emails the issued sales document to the stored buyer email", async () => {
    let sentDocument: {
      documentLabel: string;
      documentReference: string;
      recipientName?: string | null;
      to: string;
    } | null = null;
    const service = createService({
      emailService: {
        async sendSalesDocumentEmail(input) {
          sentDocument = {
            documentLabel: input.documentLabel,
            documentReference: input.documentReference,
            to: input.to,
            ...(input.recipientName !== undefined
              ? { recipientName: input.recipientName }
              : {}),
          };
          return {
            attemptId: "attempt-1",
            status: "sent",
          };
        },
      },
    });

    const result = await service.sendEmail({
      actorUserId: USER_ID,
      reference: "INV/2026/000001",
    });

    assert.deepEqual(result, { ok: true, recipientEmail: "buyer@example.com" });
    assert.deepEqual(sentDocument, {
      documentLabel: "Sales Receipt",
      documentReference: "INV/2026/000001",
      recipientName: "Adwoa Mensah",
      to: "buyer@example.com",
    });
  });
});

function createService(
  input: {
    invoiceRepository?: {
      findByReference: (reference: string) => Promise<InvoiceWithLines | null>;
    };
    emailService?: {
      sendSalesDocumentEmail: (input: {
        attachment: { content: Buffer; contentType: string; filename: string };
        documentLabel: string;
        documentReference: string;
        locationName?: string | null;
        profileEmail?: string | null;
        recipientName?: string | null;
        to: string;
      }) => Promise<{
        attemptId: string | null;
        status:
          | "bounced"
          | "complained"
          | "console_fallback"
          | "delayed"
          | "delivered"
          | "failed"
          | "sent"
          | "suppressed";
      }>;
    };
    permissionService?: {
      assertHasPermission: (input: {
        locationId?: string;
        permission: string;
        user: { userId: string };
      }) => Promise<void>;
    };
    settingsService?: {
      resolveDocumentProfile: (input?: {
        locationId?: string;
      }) => Promise<OfficialDocumentProfileResponse>;
    };
    snapshotService?: IssuedDocumentSnapshotService;
  } = {},
) {
  return new SalesIssuedDocumentSnapshotService({
    emailService: input.emailService ?? {
      async sendSalesDocumentEmail() {
        return { attemptId: "attempt-1", status: "sent" as const };
      },
    },
    invoiceRepository: input.invoiceRepository ?? {
      async findByReference(reference) {
        return reference === "INV/2026/000001" ? invoice() : null;
      },
    },
    permissionService: input.permissionService ?? {
      async assertHasPermission() {},
    },
    settingsService: input.settingsService ?? {
      async resolveDocumentProfile() {
        return profile();
      },
    },
    snapshotService:
      input.snapshotService ??
      new IssuedDocumentSnapshotService(new InMemoryIssuedDocumentRepository()),
  });
}

function invoice(overrides: Partial<InvoiceWithLines> = {}): InvoiceWithLines {
  return {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: USER_ID,
    attributedWorkerName: "Store Worker",
    classification: "outgoing",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: USER_ID,
    customerBillingAddressLines: ["12 Market Street"],
    currencyCode: "GHS",
    currencyScale: 2,
    customerEmail: "buyer@example.com",
    customerName: "Adwoa Mensah",
    customerPhone: "+233 20 000 0000",
    customerTaxNumber: "TIN-CUSTOMER",
    id: "44444444-4444-4444-8444-444444444444",
    lines: [
      {
        createdAt: NOW,
        id: "55555555-5555-4555-8555-555555555555",
        invoiceId: "44444444-4444-4444-8444-444444444444",
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
        updatedAt: NOW,
      },
    ],
    locationId: LOCATION_ID,
    notes: null,
    parentInvoiceId: null,
    parentInvoiceReference: null,
    paymentMethod: "cash",
    reference: "INV/2026/000001",
    currentPayableReference: "INV/2026/000001",
    replacementInvoiceId: null,
    replacementInvoiceReference: null,
    revisionCreditNoteId: null,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: null,
    revisionRootReference: null,
    role: "standard",
    status: "confirmed",
    subtotalAmount: "24.00",
    taxAmount: "0.00",
    totalAmount: "24.00",
    type: "pos",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}

function profile(
  overrides: Partial<OfficialDocumentProfileResponse> = {},
): OfficialDocumentProfileResponse {
  return {
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
    locationId: LOCATION_ID,
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
    ...overrides,
  };
}

function forbidden() {
  return new AppError({
    code: "forbidden",
    detail: "Forbidden in test.",
    statusCode: 403,
    title: "Forbidden",
  });
}

class InMemoryIssuedDocumentRepository {
  readonly items: PersistedIssuedDocumentSnapshot[] = [];

  async findByResource(input: {
    documentType: string;
    resourceKind: string;
    resourceReference: string;
  }) {
    return (
      this.items.find(
        (item) =>
          item.documentType === input.documentType &&
          item.resourceKind === input.resourceKind &&
          item.resourceReference === input.resourceReference,
      ) ?? null
    );
  }

  async create(input: PersistedIssuedDocumentSnapshot) {
    this.items.push(input);
    return input;
  }
}
