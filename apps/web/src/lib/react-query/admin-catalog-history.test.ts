import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  adminCatalogHistoryQueryKey,
  type CatalogHistoryEntityKind,
  fetchCatalogChangeLog,
} from "./admin-catalog-history";

describe("admin-catalog-history react-query helpers", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("builds a stable, slug-scoped query key per entity kind", () => {
    assert.deepEqual(adminCatalogHistoryQueryKey("product", "blue-mug"), [
      "admin",
      "catalog",
      "history",
      "product",
      "blue-mug",
    ]);
    assert.deepEqual(adminCatalogHistoryQueryKey("variant", "v-1"), [
      "admin",
      "catalog",
      "history",
      "variant",
      "v-1",
    ]);
  });

  for (const [entityKind, segment] of [
    ["product", "products"],
    ["variant", "variants"],
    ["brand", "brands"],
    ["category", "categories"],
  ] as const) {
    it(`routes ${entityKind} fetches to /api/admin/catalog/${segment}/{slug}/changes`, async () => {
      const fetchMock = mock.method(
        globalThis,
        "fetch",
        async (input: RequestInfo | URL) => {
          const url = String(input);
          assert.match(
            url,
            new RegExp(`/api/admin/catalog/${segment}/blue-mug/changes\\?`),
          );
          assert.match(url, /limit=20/);
          return new Response(
            JSON.stringify({ entries: [], nextCursor: null }),
            { status: 200 },
          );
        },
      );

      const result = await fetchCatalogChangeLog({
        entityKind: entityKind as CatalogHistoryEntityKind,
        slug: "blue-mug",
      });

      assert.equal(fetchMock.mock.callCount(), 1);
      assert.equal(result.entries.length, 0);
      assert.equal(result.nextCursor, null);
    });
  }

  it("forwards the cursor query param when provided", async () => {
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        const url = String(input);
        assert.match(url, /cursor=opaque-cursor/);
        return new Response(
          JSON.stringify({ entries: [], nextCursor: "next-cursor" }),
          { status: 200 },
        );
      },
    );

    const result = await fetchCatalogChangeLog({
      cursor: "opaque-cursor",
      entityKind: "brand",
      slug: "atlas-imports",
    });

    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(result.nextCursor, "next-cursor");
  });

  it("clamps the limit through the URL query string", async () => {
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.match(String(input), /limit=5/);
        return new Response(JSON.stringify({ entries: [], nextCursor: null }), {
          status: 200,
        });
      },
    );

    await fetchCatalogChangeLog({
      entityKind: "category",
      limit: 5,
      slug: "homewares",
    });

    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("rejects when the API returns a payload that does not match the schema", async () => {
    mock.method(globalThis, "fetch", async () => {
      return new Response(JSON.stringify({ entries: "not-an-array" }), {
        status: 200,
      });
    });

    await assert.rejects(
      fetchCatalogChangeLog({ entityKind: "product", slug: "blue-mug" }),
    );
  });

  it("surfaces fetch failures as ApiError-shaped throws", async () => {
    mock.method(globalThis, "fetch", async () => {
      return new Response(
        JSON.stringify({
          detail: "Permission denied",
          status: 403,
          title: "Forbidden",
          type: "about:blank",
        }),
        {
          headers: { "Content-Type": "application/problem+json" },
          status: 403,
        },
      );
    });

    await assert.rejects(
      fetchCatalogChangeLog({ entityKind: "product", slug: "blue-mug" }),
      (error: unknown) => error instanceof Error,
    );
  });
});
