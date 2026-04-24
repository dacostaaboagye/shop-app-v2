import assert from "node:assert/strict";
import test from "node:test";
import { getHeroStatusText } from "../src/modules/official-documents/official-document-pdf-layout.js";

test("keeps currency context on sales document hero status by default", () => {
  assert.equal(
    getHeroStatusText({ currencyCode: "GHS", status: "confirmed" }),
    "CONFIRMED | GHS",
  );
});

test("omits currency context on transfer document hero status", () => {
  assert.equal(
    getHeroStatusText({
      currencyCode: "GHS",
      status: "In Transit",
      statusSuffix: null,
    }),
    "IN TRANSIT",
  );
});
