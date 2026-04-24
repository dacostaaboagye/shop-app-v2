import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { fetchActiveReservations } from "./stock-admin";

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
