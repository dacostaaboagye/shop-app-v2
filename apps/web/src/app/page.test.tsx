import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "./page";

Object.assign(globalThis, { React });

describe("HomePage", () => {
  it("surfaces the architecture-first baseline", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    assert.match(markup, /Build the hard parts first\./);
    assert.match(
      markup,
      /Immutable ownership ledger before attribution or reporting/,
    );
    assert.match(
      markup,
      /Shared table patterns and UI state are already anchored/,
    );
  });
});
