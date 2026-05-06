import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-06T00:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("issued document public reference authorization", () => {
  it("does not let a guessed sales reference bypass service authorization", async () => {
    const calls: string[] = [];
    const server = createForbiddenIssuedDocumentServer(calls);

    const responses = await Promise.all([
      server.inject({
        headers: authHeaders(),
        method: "GET",
        url: "/api/documents/sales/INV%2F2026%2F999999/snapshot",
      }),
      server.inject({
        headers: authHeaders(),
        method: "GET",
        url: "/api/documents/sales/INV%2F2026%2F999999/download",
      }),
      server.inject({
        headers: authHeaders(),
        method: "POST",
        url: "/api/documents/sales/INV%2F2026%2F999999/send-email",
      }),
    ]);

    assert.deepEqual(
      responses.map((response) => response.statusCode),
      [403, 403, 403],
    );
    assert.deepEqual(calls, [
      "sales:snapshot:INV/2026/999999",
      "sales:download:INV/2026/999999",
      "sales:email:INV/2026/999999",
    ]);
  });

  it("does not let a guessed GTN reference bypass service authorization", async () => {
    const calls: string[] = [];
    const server = createForbiddenIssuedDocumentServer(calls);

    const responses = await Promise.all([
      server.inject({
        headers: authHeaders(),
        method: "GET",
        url: "/api/documents/gtns/GTN-99999/snapshot",
      }),
      server.inject({
        headers: authHeaders(),
        method: "GET",
        url: "/api/documents/gtns/GTN-99999/download",
      }),
    ]);

    assert.deepEqual(
      responses.map((response) => response.statusCode),
      [403, 403],
    );
    assert.deepEqual(calls, [
      "gtn:snapshot:GTN-99999",
      "gtn:download:GTN-99999",
    ]);
  });
});

function createForbiddenIssuedDocumentServer(calls: string[]) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "operator-user" };
        },
      },
      permissionService: {
        async assertHasPermission() {},
      },
    },
    issuedDocuments: {
      gtnDocumentSnapshotService: {
        async getOrIssueSnapshot(input) {
          calls.push(`gtn:snapshot:${input.reference}`);
          throw forbiddenDocumentError();
        },
        async getPdfDownload(input) {
          calls.push(`gtn:download:${input.reference}`);
          throw forbiddenDocumentError();
        },
      },
      salesDocumentSnapshotService: {
        async getOrIssueSnapshot(input) {
          calls.push(`sales:snapshot:${input.reference}`);
          throw forbiddenDocumentError();
        },
        async getPdfDownload(input) {
          calls.push(`sales:download:${input.reference}`);
          throw forbiddenDocumentError();
        },
        async sendEmail(input) {
          calls.push(`sales:email:${input.reference}`);
          throw forbiddenDocumentError();
        },
      },
    },
  });
}

function forbiddenDocumentError() {
  return new AppError({
    code: "forbidden",
    detail: "Public references are not authorization.",
    statusCode: 403,
    title: "Forbidden",
  });
}

function authHeaders() {
  const { token } = issueAccessToken({
    expiresInSeconds: 900,
    now: NOW,
    secret: "development-access-secret",
    userId: USER_ID,
    userSlug: "operator-user",
  });

  return { authorization: `Bearer ${token}` };
}
