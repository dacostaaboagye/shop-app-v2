import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { updateStockTakeLineCounts } from "./stock-take-counts";

afterEach(() => {
  mock.restoreAll();
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

describe("updateStockTakeLineCounts", () => {
  it("posts admin line-count entries to the admin endpoint", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/stock-takes/STK-1/lines",
        );
        assert.equal(init?.method, "PATCH");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          entries: [{ countedQuantity: 12, lineNumber: 1, note: null }],
        });

        return jsonResponse({
          errors: [],
          status: "generated",
          stockTakeReference: "STK-1",
          updatedCount: 1,
        });
      },
    );

    const response = await updateStockTakeLineCounts("admin", "STK-1", {
      entries: [{ countedQuantity: 12, lineNumber: 1, note: null }],
    });

    assert.equal(response.updatedCount, 1);
    assert.equal(response.stockTakeReference, "STK-1");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("posts manager line-count entries to the manager endpoint", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/stock-takes/STK-2/lines",
        );

        return jsonResponse({
          errors: [],
          status: "counted",
          stockTakeReference: "STK-2",
          updatedCount: 2,
        });
      },
    );

    const response = await updateStockTakeLineCounts("manager", "STK-2", {
      entries: [
        { countedQuantity: 0, lineNumber: 1, note: null },
        { countedQuantity: null, lineNumber: 2, note: "skipped" },
      ],
    });

    assert.equal(response.updatedCount, 2);
    assert.equal(response.status, "counted");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("rejects responses that do not match the contract", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    mock.method(globalThis, "fetch", async () =>
      jsonResponse({
        errors: [],
        status: "generated",
        stockTakeReference: "STK-1",
        updatedCount: -1,
      }),
    );

    await assert.rejects(() =>
      updateStockTakeLineCounts("admin", "STK-1", {
        entries: [{ countedQuantity: 1, lineNumber: 1, note: null }],
      }),
    );
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
