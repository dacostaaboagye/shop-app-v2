import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { catalogReferenceImportUploadRateLimit } from "../src/modules/catalog/catalog-reference-import.routes.js";
import { createServer } from "../src/server/create-server.js";

describe("catalog reference import routes", () => {
  it("returns brand and category templates behind their manage permissions", async () => {
    const server = createAuthorizedServer();
    const brand = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/catalog/brands/imports/template",
    });
    const category = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/catalog/categories/imports/template",
    });

    assert.equal(brand.statusCode, 200);
    assert.equal(brand.json().entity, "brand");
    assert.equal(category.statusCode, 200);
    assert.equal(category.json().entity, "category");
  });

  it("imports brands and categories with row-level summaries", async () => {
    const server = createAuthorizedServer();
    const brand = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "name,status\nAtlas Imports,active",
        fileName: "brands.csv",
      },
      url: "/api/admin/catalog/brands/imports",
    });
    const category = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "name,status\nFootwear,active",
        fileName: "categories.csv",
      },
      url: "/api/admin/catalog/categories/imports",
    });

    assert.equal(brand.statusCode, 200);
    assert.equal(brand.json().summary.importedRows, 1);
    assert.equal(category.statusCode, 200);
    assert.equal(category.json().summary.importedRows, 1);
  });

  it("limits reference import uploads before importing more rows", async () => {
    let importCalls = 0;
    const server = createAuthorizedServer({
      onImport() {
        importCalls += 1;
      },
    });

    const responses = await Promise.all(
      Array.from(
        { length: catalogReferenceImportUploadRateLimit.max + 1 },
        () =>
          server.inject({
            headers: authHeaders(),
            method: "POST",
            payload: {
              contentType: "text/csv",
              csv: "name,status\nAtlas Imports,active",
              fileName: "brands.csv",
            },
            url: "/api/admin/catalog/brands/imports",
          }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(importCalls, catalogReferenceImportUploadRateLimit.max);
  });

  it("limits category import uploads before importing more rows", async () => {
    let importCalls = 0;
    const server = createAuthorizedServer({
      onImport() {
        importCalls += 1;
      },
    });

    const responses = await Promise.all(
      Array.from(
        { length: catalogReferenceImportUploadRateLimit.max + 1 },
        () =>
          server.inject({
            headers: authHeaders(),
            method: "POST",
            payload: {
              contentType: "text/csv",
              csv: "name,status\nFootwear,active",
              fileName: "categories.csv",
            },
            url: "/api/admin/catalog/categories/imports",
          }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(importCalls, catalogReferenceImportUploadRateLimit.max);
  });

  it("declares a dedicated rate limit for reference import uploads", () => {
    assert.deepEqual(catalogReferenceImportUploadRateLimit, {
      groupId: "catalog-reference-import-upload",
      max: 5,
      timeWindow: "15 minutes",
    });
  });

  it("enforces separate brand and category permissions", async () => {
    const server = createAuthorizedServer({
      denyPermission: "catalog.brands.manage",
    });
    const brand = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "name,status\nAtlas Imports,active",
        fileName: "brands.csv",
      },
      url: "/api/admin/catalog/brands/imports",
    });
    const category = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "name,status\nFootwear,active",
        fileName: "categories.csv",
      },
      url: "/api/admin/catalog/categories/imports",
    });

    assert.equal(brand.statusCode, 403);
    assert.equal(category.statusCode, 200);
  });

  it("rejects unauthenticated reference imports", async () => {
    const server = createAuthorizedServer();
    const response = await server.inject({
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "name,status\nAtlas Imports,active",
        fileName: "brands.csv",
      },
      url: "/api/admin/catalog/brands/imports",
    });

    assert.equal(response.statusCode, 401);
  });
});

type ServerOptions = {
  denyPermission?: string;
  onImport?: () => void;
};

function createAuthorizedServer(options: ServerOptions = {}) {
  return createServer({
    catalogReferenceImport: {
      catalogReferenceImportService: {
        getTemplate(entity) {
          return {
            columns: [
              {
                description: "Name.",
                example: "Atlas Imports",
                name: "name",
                required: true,
              },
            ],
            csv: "name\nAtlas Imports",
            entity,
            format: "csv",
          };
        },
        async importBrands(input) {
          assert.equal(input.actor.userSlug, "admin-user");
          options.onImport?.();
          return response("brand", input.fileName);
        },
        async importCategories(input) {
          assert.equal(input.actor.userSlug, "admin-user");
          options.onImport?.();
          return response("category", input.fileName);
        },
      },
    },
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: "usr_123", userSlug: "admin-user" };
        },
      },
      permissionService: {
        async assertHasPermission(input) {
          if (input.permission === options.denyPermission) throw forbidden();
        },
      },
    },
  });
}

function response(entity: "brand" | "category", fileName: string) {
  return {
    entity,
    failedRows: [],
    fileName,
    importedSlugs: ["atlas-imports"],
    processedAt: "2026-05-03T12:00:00.000Z",
    summary: {
      failedRows: 0,
      importedRows: 1,
      maxRows: 1000,
      totalRows: 1,
      truncated: false,
    },
  };
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

function forbidden(): AppError {
  return new AppError({
    code: "forbidden",
    detail: "Permission denied.",
    statusCode: 403,
    title: "Forbidden",
  });
}
