import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { cancelStockTakeSession, fetchStockTakeSessions } from "./stock-takes";

afterEach(() => {
  mock.restoreAll();
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

describe("stock take session helpers", () => {
  it("fetches stock take session history by portal and filters", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/stock-takes?page=1&pageSize=25&locationSlug=central-shop&status=generated",
        );

        return jsonResponse({
          items: [],
          page: 1,
          pageSize: 25,
          totalCount: 0,
        });
      },
    );

    const response = await fetchStockTakeSessions("manager", {
      locationSlug: "central-shop",
      page: 1,
      pageSize: 25,
      status: "generated",
    });

    assert.equal(response.totalCount, 0);
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("cancels stock take sessions by public reference", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/stock-takes/STKTAKE-2026-0001/cancel",
        );
        assert.equal(init?.method, "POST");

        return jsonResponse({
          appliedAt: null,
          appliedByUserSlug: null,
          blankSheet: false,
          bookletPdfUrl: "/api/admin/stock-takes/STKTAKE-2026-0001/booklet.pdf",
          generatedAt: "2026-05-04T09:00:00.000Z",
          generatedByUserSlug: "admin-user",
          lineCount: 24,
          locationName: "Central Shop",
          locationSlug: "central-shop",
          mode: "blind",
          printableBookletUrl: "/admin/stock/takes/STKTAKE-2026-0001/booklet",
          sheetCsvUrl: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.csv",
          sheetXlsxUrl: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.xlsx",
          status: "cancelled",
          stockTakeReference: "STKTAKE-2026-0001",
          varianceReportPdfUrl: null,
        });
      },
    );

    const response = await cancelStockTakeSession("admin", "STKTAKE-2026-0001");

    assert.equal(response.status, "cancelled");
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
