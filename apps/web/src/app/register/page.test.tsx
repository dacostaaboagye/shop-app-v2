import assert from "node:assert/strict";
import { describe, it } from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppProviders } from "@/components/providers/app-providers";
import RegisterPage from "./page";

Object.assign(globalThis, { React });

describe("RegisterPage", () => {
  it("renders the dedicated sign-up route", () => {
    const markup = renderToStaticMarkup(
      <AppProviders>
        <RegisterPage />
      </AppProviders>,
    );

    assert.match(markup, /Create account/);
    assert.match(markup, /Already have an account\?/);
    assert.match(markup, /Sign in/);
  });
});
