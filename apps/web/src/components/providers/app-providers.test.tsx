import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppProviders } from "./app-providers";

Object.assign(globalThis, { React });

describe("AppProviders", () => {
  it("renders children within the shared provider tree", () => {
    const markup = renderToStaticMarkup(
      <AppProviders>
        <div>provider ready</div>
      </AppProviders>,
    );

    assert.match(markup, /provider ready/);
  });
});
