import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  fetchActiveReservations,
  postManagerOpeningStock,
} from "./stock-admin";

describe("fetchActiveReservations", () => {
  afterEach(() => {
    mock.restoreAll();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("requests the active reservation admin endpoint with query params", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/stock/reservations/active?limit=25&locationId=11111111-1111-4111-8111-111111111111&sourceType=ecommerce",
        );

        return new Response(JSON.stringify({ items: [] }), {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        });
      },
    );

    await fetchActiveReservations({
      limit: 25,
      locationId: "11111111-1111-4111-8111-111111111111",
      sourceType: "ecommerce",
    });

    assert.equal(fetchMock.mock.callCount(), 1);
  });
});

describe("postManagerOpeningStock", () => {
  afterEach(() => {
    mock.restoreAll();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("posts opening setup batches to the manager endpoint", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/stock/balances/opening",
        );
        assert.equal(init?.method, "POST");
        assert.match(String(init?.body), /RICE-5KG/);

        return new Response(
          JSON.stringify({
            initializedCount: 1,
            items: [],
            locationName: "Downtown Store",
            locationSlug: "downtown-store",
            sourceKey: "sheet-1",
            sourceType: "physical_count",
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        );
      },
    );

    await postManagerOpeningStock({
      lines: [{ note: undefined, onHandQuantity: 10, sku: "RICE-5KG" }],
      locationSlug: "downtown-store",
      note: undefined,
      sourceReference: "sheet-1",
      sourceType: "physical_count",
    });

    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
