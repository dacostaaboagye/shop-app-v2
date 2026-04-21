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
});

function createService(
  input: {
    permissionService?: {
      assertHasPermission: (input: {
        locationId?: string;
        permission: string;
        user: { userId: string };
      }) => Promise<void>;
    };
    settingsService?: {
      resolveDocumentProfile: () => Promise<OfficialDocumentProfileResponse>;
    };
    snapshotService?: IssuedDocumentSnapshotService;
  } = {},
) {
  return new SalesIssuedDocumentSnapshotService({
    invoiceRepository: {
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

function invoice(): InvoiceWithLines {
  return {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: USER_ID,
    attributedWorkerName: "Store Worker",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: USER_ID,
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
    paymentMethod: "cash",
    reference: "INV/2026/000001",
    status: "confirmed",
    subtotalAmount: "24.00",
    taxAmount: "0.00",
    totalAmount: "24.00",
    type: "pos",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
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
