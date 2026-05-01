import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  byteLength,
  maskEmailForLog,
} from "../src/modules/_core/log-redaction.js";

describe("maskEmailForLog", () => {
  it("masks the local part and keeps the domain", () => {
    assert.equal(
      maskEmailForLog("ada.lovelace@example.com"),
      "a***@example.com",
    );
  });

  it("handles single-character local parts", () => {
    assert.equal(maskEmailForLog("a@example.com"), "a***@example.com");
  });

  it("trims leading and trailing whitespace", () => {
    assert.equal(maskEmailForLog("  worker@shop.app  "), "w***@shop.app");
  });

  it("returns a placeholder for nullish input", () => {
    assert.equal(maskEmailForLog(null), "(no recipient)");
    assert.equal(maskEmailForLog(undefined), "(no recipient)");
    assert.equal(maskEmailForLog(""), "(no recipient)");
  });

  it("returns a placeholder for malformed input", () => {
    assert.equal(maskEmailForLog("not-an-email"), "(invalid)");
    assert.equal(maskEmailForLog("@noprefix.com"), "(invalid)");
  });
});

describe("byteLength", () => {
  it("returns the utf-8 byte length", () => {
    assert.equal(byteLength("hello"), 5);
    assert.equal(byteLength("café"), 5); // é is 2 bytes in UTF-8
    assert.equal(byteLength(null), 0);
    assert.equal(byteLength(undefined), 0);
    assert.equal(byteLength(""), 0);
  });
});
