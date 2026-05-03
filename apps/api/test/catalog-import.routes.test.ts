import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("catalog import routes", () => {
  it("returns the CSV template behind catalog product management permission", async () => {
    const server = createAuthorizedServer();
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/catalog/imports/template",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().format, "csv");
    assert.match(response.json().csv, /productName,variantName,sku/);
  });

  it("starts an import and returns only a public job reference", async () => {
    const server = createAuthorizedServer({
      catalogImport: {
        catalogImportService: {
          async getJob() {
            return null;
          },
          async getReport() {
            return null;
          },
          async startImport(input) {
            assert.equal(input.actor.userSlug, "admin-user");
            return {
              acceptedAt: input.now.toISOString(),
              fileName: input.fileName,
              jobReference: "CIMP-00001",
              maxRows: 1000,
              status: "completed",
            };
          },
        },
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
        fileName: "catalog.csv",
      },
      url: "/api/admin/catalog/imports",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().jobReference, "CIMP-00001");
    assert.equal("jobId" in response.json(), false);
  });

  it("returns 404 for missing job status", async () => {
    const server = createAuthorizedServer();
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/catalog/imports/CIMP-404",
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().title, "Catalog import not found");
  });

  it("denies callers without catalog product management permission", async () => {
    const server = createAuthorizedServer({ hasPermission: false });
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/catalog/imports/template",
    });

    assert.equal(response.statusCode, 403);
  });

  it("denies import start, job status, and report to callers without permission", async () => {
    const server = createAuthorizedServer({ hasPermission: false });
    const cases = [
      {
        method: "POST",
        payload: {
          contentType: "text/csv",
          csv: "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
          fileName: "catalog.csv",
        },
        url: "/api/admin/catalog/imports",
      },
      { method: "GET", url: "/api/admin/catalog/imports/CIMP-00001" },
      { method: "GET", url: "/api/admin/catalog/imports/CIMP-00001/report" },
    ] as const;

    for (const item of cases) {
      const request =
        "payload" in item
          ? {
              headers: authHeaders(),
              method: item.method,
              payload: item.payload,
              url: item.url,
            }
          : { headers: authHeaders(), method: item.method, url: item.url };
      const response = await server.inject(request);
      assert.equal(response.statusCode, 403, `${item.method} ${item.url}`);
    }
  });

  it("rejects unauthenticated import start, job status, and report requests", async () => {
    const server = createAuthorizedServer();
    const cases = [
      {
        method: "POST",
        payload: {
          contentType: "text/csv",
          csv: "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
          fileName: "catalog.csv",
        },
        url: "/api/admin/catalog/imports",
      },
      { method: "GET", url: "/api/admin/catalog/imports/CIMP-00001" },
      { method: "GET", url: "/api/admin/catalog/imports/CIMP-00001/report" },
    ] as const;

    for (const item of cases) {
      const request =
        "payload" in item
          ? { method: item.method, payload: item.payload, url: item.url }
          : { method: item.method, url: item.url };
      const response = await server.inject(request);
      assert.equal(response.statusCode, 401, `${item.method} ${item.url}`);
    }
  });
});

type ServerOptions = Parameters<typeof createServer>[0] & {
  hasPermission?: boolean;
};

function createAuthorizedServer(options: ServerOptions = {}) {
  const { hasPermission = true, ...serverOptions } = options;
  return createServer({
    catalogImport: serverOptions.catalogImport ?? {
      catalogImportService: {
        async getJob() {
          return null;
        },
        async getReport() {
          return null;
        },
        async startImport() {
          throw new Error("startImport not configured for this test");
        },
      },
    },
    ...serverOptions,
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: "usr_123", userSlug: "admin-user" };
        },
      },
      permissionService: {
        async assertHasPermission(input) {
          assert.equal(input.permission, "catalog.products.manage");
          if (!hasPermission) throw forbiddenError();
        },
      },
    },
  });
}

function authHeaders() {
  return { authorization: `Bearer ${issueTestToken()}` };
}

function issueTestToken() {
  return issueAccessToken({
    expiresInSeconds: 900,
    now: new Date("2026-05-03T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "admin-user",
  }).token;
}

function forbiddenError(): AppError {
  return new AppError({
    code: "forbidden",
    detail: "Permission denied.",
    statusCode: 403,
    title: "Forbidden",
  });
}
