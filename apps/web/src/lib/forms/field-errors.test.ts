import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFormFieldMessages } from "./field-errors";

describe("getFormFieldMessages", () => {
  it("normalizes strings, Error instances, and message objects", () => {
    const messages = getFormFieldMessages([
      "Enter an email address.",
      new Error("Password is required."),
      { message: "Enter an email address." },
      { message: "  " },
      null,
    ]);

    assert.deepEqual(messages, [
      "Enter an email address.",
      "Password is required.",
    ]);
  });

  it("returns an empty array for missing values", () => {
    assert.deepEqual(getFormFieldMessages(undefined), []);
    assert.deepEqual(getFormFieldMessages([]), []);
  });
});
