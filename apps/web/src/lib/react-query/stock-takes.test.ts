import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  createStockTakeSheet,
  downloadStockTakeSheetCsv,
  fetchStockTakeDetail,
} from "./stock-takes";

afterEach(() => {
  mock.restoreAll();
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

describe("stock take helpers", () => {
  it("posts stock take sheet generation requests to the selected portal", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/stock-takes",
        );
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          locationSlug: "central-shop",
          mode: "blind",
        });

        return jsonResponse({
          blankSheet: true,
          generatedAt: "2026-05-04T09:00:00.000Z",
          generatedByUserSlug: "admin-user",
          lineCount: 24,
          locationName: "Central Shop",
          locationSlug: "central-shop",
          mode: "blind",
          printableBookletUrl: "/admin/stock/takes/STK-2026-0001/booklet",
          sheetCsvUrl: "/api/admin/stock-takes/STK-2026-0001/sheet.csv",
          status: "generated",
          stockTakeReference: "STK-2026-0001",
        });
      },
    );

    const response = await createStockTakeSheet("admin", {
      locationSlug: "central-shop",
      mode: "blind",
    });

    assert.equal(response.stockTakeReference, "STK-2026-0001");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("fetches stock take details by public reference", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/stock-takes/STK-2026-0001",
        );

        return jsonResponse({
          blankSheet: false,
          generatedAt: "2026-05-04T09:00:00.000Z",
          generatedByUserSlug: "manager-user",
          lineCount: 1,
          lines: [
            {
              expectedQuantity: 10,
              lineNumber: 1,
              productName: "Rice",
              sku: "RICE-5KG",
              variantName: "5kg",
            },
          ],
          locationName: "Central Shop",
          locationSlug: "central-shop",
          mode: "assisted",
          printableBookletUrl: "/manager/stock/takes/STK-2026-0001/booklet",
          sheetCsvUrl: "/api/manager/stock-takes/STK-2026-0001/sheet.csv",
          status: "generated",
          stockTakeReference: "STK-2026-0001",
        });
      },
    );

    const response = await fetchStockTakeDetail("manager", "STK-2026-0001");

    assert.equal(response.lines[0]?.sku, "RICE-5KG");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("downloads the generated CSV from the selected portal", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/stock-takes/STK-2026-0001/sheet.csv",
        );

        return new Response("sku,countedQuantity", {
          headers: {
            "content-disposition": 'attachment; filename="stock-take.csv"',
            "content-type": "text/csv",
          },
          status: 200,
        });
      },
    );

    const file = await downloadStockTakeSheetCsv("admin", "STK-2026-0001");

    assert.equal(file.name, "stock-take.csv");
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
