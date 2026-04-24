import assert from "node:assert/strict";
import test from "node:test";
import { toColorInputValue } from "./official-document-color-input.support";

const COLOR_INPUT_PREFIX = String.fromCharCode(35);

test("normalizes editable document colors for browser color pickers", () => {
  assert.equal(
    toColorInputValue(`${COLOR_INPUT_PREFIX}abc`),
    `${COLOR_INPUT_PREFIX}aabbcc`,
  );
  assert.equal(
    toColorInputValue(`${COLOR_INPUT_PREFIX}AABBCC`),
    `${COLOR_INPUT_PREFIX}aabbcc`,
  );
  assert.equal(
    toColorInputValue("hsl(174 52% 23%)"),
    `${COLOR_INPUT_PREFIX}1c5953`,
  );
});

test("falls back to a valid color picker value for unsupported css colors", () => {
  assert.equal(
    toColorInputValue("var(--brand)"),
    `${COLOR_INPUT_PREFIX}${"0".repeat(6)}`,
  );
});
