import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OfficialDocumentProfileResponse } from "@shop/contracts";
import {
  IssuedDocumentSnapshotService,
  type PersistedIssuedDocumentSnapshot,
} from "../src/modules/official-documents/issued-document-snapshot.service.js";

const NOW = new Date("2026-04-20T00:00:00.000Z");
const profile: OfficialDocumentProfileResponse = {
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

describe("IssuedDocumentSnapshotService", () => {
  it("creates immutable issued document snapshots with a content hash", async () => {
    const repository = new InMemoryIssuedDocumentRepository();
    const service = new IssuedDocumentSnapshotService(repository);

    const snapshot = await service.issueSnapshot({
      documentReference: "RCT/2026/000001",
      documentType: "sales_receipt",
      issuedAt: NOW,
      issuedBy: "11111111-1111-4111-8111-111111111111",
      locationId: "22222222-2222-4222-8222-222222222222",
      payloadSnapshot: { reference: "INV/2026/000001", totalAmount: "24.00" },
      profileSnapshot: profile,
      resourceKind: "invoice",
      resourceReference: "INV/2026/000001",
    });

    assert.equal(snapshot.schemaVersion, "official-document-v1");
    assert.match(snapshot.contentHash, /^sha256:/);
    assert.equal(repository.items.length, 1);
  });

  it("returns the existing snapshot for an idempotent issue request", async () => {
    const repository = new InMemoryIssuedDocumentRepository();
    const service = new IssuedDocumentSnapshotService(repository);
    const input = {
      documentReference: "RCT/2026/000001",
      documentType: "sales_receipt" as const,
      issuedAt: NOW,
      issuedBy: null,
      locationId: null,
      payloadSnapshot: { totalAmount: "24.00", reference: "INV/2026/000001" },
      profileSnapshot: profile,
      resourceKind: "invoice",
      resourceReference: "INV/2026/000001",
    };

    const first = await service.issueSnapshot(input);
    const second = await service.issueSnapshot(input);

    assert.equal(first.contentHash, second.contentHash);
    assert.equal(repository.items.length, 1);
  });

  it("rejects attempts to reissue the same resource with different content", async () => {
    const repository = new InMemoryIssuedDocumentRepository();
    const service = new IssuedDocumentSnapshotService(repository);
    const base = {
      documentReference: "RCT/2026/000001",
      documentType: "sales_receipt" as const,
      issuedAt: NOW,
      issuedBy: null,
      locationId: null,
      profileSnapshot: profile,
      resourceKind: "invoice",
      resourceReference: "INV/2026/000001",
    };

    await service.issueSnapshot({
      ...base,
      payloadSnapshot: { totalAmount: "24.00" },
    });

    await assert.rejects(
      () =>
        service.issueSnapshot({
          ...base,
          payloadSnapshot: { totalAmount: "30.00" },
        }),
      /different content/,
    );
  });
});

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
