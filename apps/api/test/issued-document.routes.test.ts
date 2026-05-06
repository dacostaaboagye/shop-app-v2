import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IssuedDocumentSnapshotResponse } from "@shop/contracts";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { issuedDocumentDownloadRateLimit } from "../src/modules/official-documents/issued-document.routes.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-20T00:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";

describe("issued document routes", () => {
  it("returns an official sales document snapshot for an authenticated actor", async () => {
    const calls: IssuedDocumentCall[] = [];
    const server = createIssuedDocumentServer(calls);

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/documents/sales/INV%2F2026%2F000001/snapshot",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().documentReference, "INV/2026/000001");
    assert.equal(response.json().payloadSnapshot.currencyCode, "GHS");
    assert.equal(response.json().payloadSnapshot.currencyScale, 2);
    assert.equal(response.json().profileSnapshot.currencyCode, "GHS");
    assert.deepEqual(calls, [
      {
        actorUserId: USER_ID,
        actorUserSlug: "admin-user",
        reference: "INV/2026/000001",
      },
    ]);
  });

  it("requires authentication before issuing a sales document snapshot", async () => {
    const server = createIssuedDocumentServer([]);

    const response = await server.inject({
      method: "GET",
      url: "/api/documents/sales/INV%2F2026%2F000001/snapshot",
    });

    assert.equal(response.statusCode, 401);
  });

  it("downloads the official sales document PDF from the issued snapshot", async () => {
    const calls: IssuedDocumentCall[] = [];
    const server = createIssuedDocumentServer(calls);

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/documents/sales/INV%2F2026%2F000001/download",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "application/pdf");
    assert.equal(
      response.headers["content-disposition"],
      'attachment; filename="INV-2026-000001.pdf"',
    );
    assert.equal(response.rawPayload.subarray(0, 4).toString("utf8"), "%PDF");
    assert.deepEqual(calls, [
      {
        actorUserId: USER_ID,
        actorUserSlug: "admin-user",
        reference: "INV/2026/000001",
      },
    ]);
  });

  it("limits repeated official document downloads before rendering PDFs", async () => {
    const calls: IssuedDocumentCall[] = [];
    const server = createIssuedDocumentServer(calls);

    const responses = await Promise.all(
      Array.from({ length: issuedDocumentDownloadRateLimit.max + 1 }, () =>
        server.inject({
          headers: { authorization: bearerToken() },
          method: "GET",
          url: "/api/documents/sales/INV%2F2026%2F000001/download",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(calls.length, issuedDocumentDownloadRateLimit.max);
  });

  it("declares a dedicated rate limit for official document downloads", () => {
    assert.deepEqual(issuedDocumentDownloadRateLimit, {
      groupId: "issued-document-download",
      max: 30,
      timeWindow: "1 minute",
    });
  });

  it("emails the official sales document to the stored buyer email", async () => {
    const calls: IssuedDocumentCall[] = [];
    const server = createIssuedDocumentServer(calls);

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      url: "/api/documents/sales/INV%2F2026%2F000001/send-email",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      ok: true,
      recipientEmail: "buyer@example.com",
    });
    assert.deepEqual(calls, [
      {
        actorUserId: USER_ID,
        actorUserSlug: "admin-user",
        reference: "INV/2026/000001",
      },
    ]);
  });

  it("limits repeated official sales document email sends", async () => {
    const calls: IssuedDocumentCall[] = [];
    const server = createIssuedDocumentServer(calls);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        server.inject({
          headers: { authorization: bearerToken() },
          method: "POST",
          url: "/api/documents/sales/INV%2F2026%2F000001/send-email",
        }),
      ),
    );

    const limitedResponse = responses.at(-1);
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(calls.length, 5);
  });

  it("downloads the official GTN PDF from the issued snapshot", async () => {
    const calls: IssuedDocumentCall[] = [];
    const server = createIssuedDocumentServer(calls);

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/documents/gtns/GTN-00001/download",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "application/pdf");
    assert.equal(
      response.headers["content-disposition"],
      'attachment; filename="GTN-00001.pdf"',
    );
    assert.deepEqual(calls, [
      {
        actorUserId: USER_ID,
        actorUserSlug: "admin-user",
        reference: "GTN-00001",
      },
    ]);
  });

  it("limits repeated GTN document downloads before rendering PDFs", async () => {
    const calls: IssuedDocumentCall[] = [];
    const server = createIssuedDocumentServer(calls);

    const responses = await Promise.all(
      Array.from({ length: issuedDocumentDownloadRateLimit.max + 1 }, () =>
        server.inject({
          headers: { authorization: bearerToken() },
          method: "GET",
          url: "/api/documents/gtns/GTN-00001/download",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(calls.length, issuedDocumentDownloadRateLimit.max);
  });
});

type IssuedDocumentCall = {
  actorUserId: string;
  actorUserSlug?: string;
  reference: string;
};

function createIssuedDocumentServer(calls: IssuedDocumentCall[]) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate(token) {
          const { AccessTokenAuthenticationService } = await import(
            "../src/modules/auth/access-token-authentication.service.js"
          );
          return new AccessTokenAuthenticationService(
            {
              async findUserById() {
                return {
                  id: USER_ID,
                  slug: "admin-user",
                  status: "active" as const,
                };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission() {},
      },
    },
    issuedDocuments: {
      gtnDocumentSnapshotService: {
        async getPdfDownload(input) {
          calls.push(input);
          return {
            body: Buffer.from("%PDF gtn"),
            contentType: "application/pdf",
            filename: "GTN-00001.pdf",
          };
        },
        async getOrIssueSnapshot(input) {
          calls.push(input);
          return { ...snapshot(), documentReference: input.reference };
        },
      },
      salesDocumentSnapshotService: {
        async getPdfDownload(input) {
          calls.push(input);
          return {
            body: Buffer.from("%PDF test"),
            contentType: "application/pdf",
            filename: "INV-2026-000001.pdf",
          };
        },
        async getOrIssueSnapshot(input) {
          calls.push(input);
          return snapshot();
        },
        async sendEmail(input) {
          calls.push(input);
          return {
            ok: true as const,
            recipientEmail: "buyer@example.com",
          };
        },
      },
    },
  });
}

function snapshot(): IssuedDocumentSnapshotResponse {
  return {
    contentHash: "sha256:test",
    documentReference: "INV/2026/000001",
    documentType: "sales_receipt",
    issuedAt: NOW.toISOString(),
    locationId: LOCATION_ID,
    payloadSnapshot: {
      attributedWorkerEmail: null,
      attributedWorkerId: null,
      attributedWorkerName: null,
      confirmedAt: NOW.toISOString(),
      createdAt: NOW.toISOString(),
      currencyCode: "GHS",
      currencyScale: 2,
      lines: [],
      locationId: LOCATION_ID,
      notes: null,
      paymentMethod: "cash",
      reference: "INV/2026/000001",
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
    },
    resourceKind: "invoice",
    resourceReference: "INV/2026/000001",
    schemaVersion: "official-document-v1",
  };
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "admin-user",
    }).token
  }`;
}
