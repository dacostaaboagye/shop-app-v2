import assert from "node:assert/strict";
import { describe, it } from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppProviders } from "@/components/providers/app-providers";
import LoginPage from "./page";

Object.assign(globalThis, { React });

describe("LoginPage", () => {
  it("renders the dedicated sign-in route", () => {
    const markup = renderToStaticMarkup(
      <AppProviders>
        <LoginPage />
      </AppProviders>,
    );

    assert.match(markup, /Sign In/);
    assert.match(markup, /No account\?/i);
    assert.match(markup, /Create Account/);
  });
});
