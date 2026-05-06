import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IssuedDocumentSnapshotResponse } from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { EffectivePermission } from "../src/modules/access-control/permission-resolution.service.js";
import { GtnIssuedDocumentSnapshotService } from "../src/modules/official-documents/gtn-issued-document-snapshot.service.js";
import type {
  GtnRow,
  SupplyRequestRow,
} from "../src/modules/stock/postgres-supply-request.repository.js";

const NOW = new Date("2026-05-06T00:00:00.000Z");
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const REQUESTER_ID = "22222222-2222-4222-8222-222222222222";
const SOURCE_LOCATION_ID = "33333333-3333-4333-8333-333333333333";
const DESTINATION_LOCATION_ID = "44444444-4444-4444-8444-444444444444";

describe("GtnIssuedDocumentSnapshotService", () => {
  it("rejects a guessed GTN reference when the actor has no scoped access", async () => {
    const permissionCalls: string[] = [];
    let adminScopeChecked = false;
    const service = createService({
      permissionService: {
        async assertHasPermission(input) {
          permissionCalls.push(`${input.permission}:${input.locationId}`);
          throw forbidden();
        },
        async resolvePermissionsForAnyScope() {
          adminScopeChecked = true;
          return [];
        },
      },
    });

    await assert.rejects(
      () =>
        service.getOrIssueSnapshot({
          actorUserId: ACTOR_ID,
          reference: "GTN-99999",
        }),
      /permission to access this goods transfer note document/,
    );

    assert.deepEqual(permissionCalls, [
      `stock.supply.manage:${SOURCE_LOCATION_ID}`,
      `stock.supply.manage:${DESTINATION_LOCATION_ID}`,
    ]);
    assert.equal(adminScopeChecked, true);
  });

  it("allows a source-location manager to access the GTN document", async () => {
    const service = createService({
      permissionService: {
        async assertHasPermission(input) {
          if (
            input.permission === "stock.supply.manage" &&
            input.locationId === SOURCE_LOCATION_ID
          ) {
            return;
          }
          throw forbidden();
        },
        async resolvePermissionsForAnyScope() {
          return [];
        },
      },
      snapshotService: {
        async findSnapshotByResource() {
          return snapshot();
        },
        async issueSnapshot() {
          throw new Error("Existing snapshot should be reused.");
        },
      },
    });

    const result = await service.getOrIssueSnapshot({
      actorUserId: ACTOR_ID,
      reference: "GTN-00001",
    });

    assert.equal(result.documentReference, "GTN-00001");
    assert.equal(result.resourceReference, "GTN-00001");
  });
});

function createService(input: {
  permissionService: {
    assertHasPermission: (input: {
      locationId?: string;
      permission: string;
      user: { userId: string };
    }) => Promise<void>;
    resolvePermissionsForAnyScope: (input: {
      userId: string;
    }) => Promise<EffectivePermission[]>;
  };
  snapshotService?: {
    findSnapshotByResource: (input: {
      documentType: string;
      resourceKind: string;
      resourceReference: string;
    }) => Promise<IssuedDocumentSnapshotResponse | null>;
    issueSnapshot: (input: unknown) => Promise<IssuedDocumentSnapshotResponse>;
  };
}) {
  return new GtnIssuedDocumentSnapshotService({
    permissionService: input.permissionService,
    settingsService: {
      async resolveDocumentProfile() {
        throw new Error("Settings should not be needed by these tests.");
      },
    },
    snapshotService: input.snapshotService ?? {
      async findSnapshotByResource() {
        return null;
      },
      async issueSnapshot() {
        throw new Error("Issuing should not be reached by these tests.");
      },
    },
    supplyRequestRepository: {
      async findById() {
        return supplyRequest();
      },
      async findGtnByReference() {
        return gtn();
      },
    },
  });
}

function gtn(): GtnRow {
  return {
    createdAt: NOW,
    destinationLocationId: DESTINATION_LOCATION_ID,
    destinationLocationName: "Warehouse",
    dispatchedAt: NOW,
    dispatchedBy: "dispatcher-user",
    dispatchedByName: "Dispatcher User",
    id: "55555555-5555-4555-8555-555555555555",
    notes: null,
    quantity: 3,
    receivedAt: null,
    receivedBy: null,
    receivedByName: null,
    reference: "GTN-00001",
    skuId: "66666666-6666-4666-8666-666666666666",
    skuSnapshot: {
      productName: "Rice",
      sku: "RICE-5KG",
      variantName: "5kg",
    },
    sourceLocationId: SOURCE_LOCATION_ID,
    sourceLocationName: "Main Store",
    status: "dispatched",
    supplyRequestId: "77777777-7777-4777-8777-777777777777",
    supplyRequestReference: "SUP-00001",
  };
}

function supplyRequest(): SupplyRequestRow {
  return {
    approvedQuantity: 3,
    createdAt: NOW,
    dispatchedAt: NOW,
    dispatchedBy: "dispatcher-user",
    gtnReference: "GTN-00001",
    id: "77777777-7777-4777-8777-777777777777",
    locationId: DESTINATION_LOCATION_ID,
    locationName: "Warehouse",
    notes: null,
    receivedAt: null,
    reference: "SUP-00001",
    requestGroupReference: null,
    requesterEmail: null,
    requesterId: REQUESTER_ID,
    requesterName: null,
    requestedQuantity: 3,
    resolutionNotes: null,
    resolvedAt: NOW,
    resolvedBy: "manager-user",
    skuId: "66666666-6666-4666-8666-666666666666",
    skuSnapshot: {
      productName: "Rice",
      sku: "RICE-5KG",
      variantName: "5kg",
    },
    sourceLocationId: SOURCE_LOCATION_ID,
    sourceLocationName: "Main Store",
    sourceReservationStatus: null,
    status: "dispatched",
    transferReference: null,
  };
}

function snapshot(): IssuedDocumentSnapshotResponse {
  return {
    contentHash: "sha256:test",
    documentReference: "GTN-00001",
    documentType: "goods_transfer_note",
    issuedAt: NOW.toISOString(),
    locationId: DESTINATION_LOCATION_ID,
    payloadSnapshot: {
      destinationLocationId: DESTINATION_LOCATION_ID,
      destinationLocationName: "Warehouse",
      dispatchedAt: NOW.toISOString(),
      dispatchedBy: "dispatcher-user",
      dispatchedByName: "Dispatcher User",
      gtnId: "55555555-5555-4555-8555-555555555555",
      notes: null,
      quantity: 3,
      receivedAt: null,
      receivedBy: null,
      receivedByName: null,
      reference: "GTN-00001",
      skuId: "66666666-6666-4666-8666-666666666666",
      skuSnapshot: {
        productName: "Rice",
        sku: "RICE-5KG",
        variantName: "5kg",
      },
      sourceLocationId: SOURCE_LOCATION_ID,
      sourceLocationName: "Main Store",
      status: "dispatched",
      supplyRequestId: "77777777-7777-4777-8777-777777777777",
      supplyRequestReference: "SUP-00001",
    },
    profileSnapshot: {
      accentColor: "hsl(28 72% 48%)",
      addressLines: ["Airport Road"],
      brandName: "Shop App",
      currencyCode: "GHS",
      currencyScale: 2,
      documentPrefix: "GTN",
      email: "airport@example.com",
      footer: "Official transfer document.",
      legalName: "Shop App Trading Company",
      locale: "en-GH",
      locationId: DESTINATION_LOCATION_ID,
      locationName: "Warehouse",
      logoImageUrl: null,
      logoText: "SA",
      paperSize: "a4",
      phone: "+233 00 000 0000",
      primaryColor: "hsl(174 52% 23%)",
      registrationNumber: "REGISTRATION-PENDING",
      taxNumber: "TAX-PENDING",
      timezone: "Africa/Accra",
      website: "www.example.com",
    },
    resourceKind: "goods_transfer_note",
    resourceReference: "GTN-00001",
    schemaVersion: "official-document-v1",
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
