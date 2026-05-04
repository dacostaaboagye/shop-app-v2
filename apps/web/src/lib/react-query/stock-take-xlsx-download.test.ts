import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { downloadStockTakeSheetXlsx } from "./stock-takes";

afterEach(() => {
  mock.restoreAll();
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

describe("stock take XLSX download helper", () => {
  it("downloads the generated XLSX workbook from the selected portal", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/stock-takes/STK-2026-0001/sheet.xlsx",
        );

        return new Response("xlsx", {
          headers: {
            "content-disposition": 'attachment; filename="stock-take.xlsx"',
            "content-type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
          status: 200,
        });
      },
    );

    const file = await downloadStockTakeSheetXlsx("manager", "STK-2026-0001");

    assert.equal(file.name, "stock-take.xlsx");
    assert.equal(
      file.type,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
