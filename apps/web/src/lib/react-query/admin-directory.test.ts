import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { fetchAdminSuppliers } from "./admin-directory";

describe("admin directory queries", () => {
  afterEach(() => {
    mock.restoreAll();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("requests the supplier organization endpoint", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/suppliers?dir=asc&page=1&pageSize=20&q=acme&sort=name&status=active",
        );

        return new Response(
          JSON.stringify({
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        );
      },
    );

    await fetchAdminSuppliers({
      dir: "asc",
      page: 1,
      pageSize: 20,
      q: "acme",
      sort: "name",
      status: "active",
    });

    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
