import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  fetchAdminOpeningVariants,
  fetchManagerOpeningVariants,
} from "./catalog-variants";

describe("opening variant search helpers", () => {
  afterEach(() => {
    mock.restoreAll();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("requests the admin opening variant endpoint by location slug", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/catalog/variants/opening?locationSlug=downtown-store&page=1&pageSize=100&q=rice",
        );
        return jsonResponse();
      },
    );

    await fetchAdminOpeningVariants({
      locationSlug: "downtown-store",
      page: 1,
      pageSize: 100,
      q: "rice",
    });

    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("requests the manager opening variant endpoint by scoped location id", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/catalog/variants/opening?locationId=11111111-1111-4111-8111-111111111111&page=1&pageSize=50&q=soap",
        );
        return jsonResponse();
      },
    );

    await fetchManagerOpeningVariants({
      locationId: "11111111-1111-4111-8111-111111111111",
      page: 1,
      pageSize: 50,
      q: "soap",
    });

    assert.equal(fetchMock.mock.callCount(), 1);
  });
});

function jsonResponse() {
  return new Response(
    JSON.stringify({ items: [], page: 1, pageSize: 100, total: 0 }),
    {
      headers: { "content-type": "application/json" },
      status: 200,
    },
  );
}
