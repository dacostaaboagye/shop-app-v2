import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCount,
  formatDateTime,
  formatPublicReference,
  formatSupportText,
} from "./format";

test("formats integer counts with locale-aware separators", () => {
  assert.equal(formatCount(1200, "en-US"), "1,200");
  assert.equal(formatCount(null), "0");
});

test("formats date-time values and falls back safely", () => {
  assert.equal(
    formatDateTime("2026-04-25T08:30:00.000Z", { locale: "en-GB" }),
    "25 Apr 2026, 08:30",
  );
  assert.equal(formatDateTime("not-a-date"), "Not available");
});

test("normalizes public references and support text", () => {
  assert.equal(formatPublicReference("  TRF-001  "), "TRF-001");
  assert.equal(formatPublicReference(" "), "Not available");
  assert.equal(formatSupportText("  Front counter  "), "Front counter");
  assert.equal(formatSupportText(""), "Not recorded");
});
