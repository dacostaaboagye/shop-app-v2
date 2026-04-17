import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppProviders } from "@/components/providers/app-providers";
import HomePage from "./page";

Object.assign(globalThis, { React });

describe("HomePage", () => {
  it("renders the storefront landing with account entry calls to action", () => {
    const markup = renderToStaticMarkup(
      <AppProviders>
        <HomePage />
      </AppProviders>,
    );

    assert.match(markup, /Stock accountability, end to end\./);
    assert.match(markup, /Create account/);
    assert.match(markup, /Server-checked, no client-side trust\./);
  });
});
