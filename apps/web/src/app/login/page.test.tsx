import assert from "node:assert/strict";
import { describe, it } from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppProviders } from "@/components/providers/app-providers";
import LoginPage from "./page";

Object.assign(globalThis, { React });

describe("LoginPage", () => {
  it("renders the dedicated sign-in route", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(<AppProviders>{page}</AppProviders>);

    assert.match(markup, /Sign In/);
    assert.doesNotMatch(markup, /No account\?/i);
    assert.doesNotMatch(markup, /Create Account/);
    assert.doesNotMatch(markup, /Continue with Google/);
  });

  it("ignores OAuth callback errors for the operations portal", async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(<AppProviders>{page}</AppProviders>);

    assert.doesNotMatch(markup, /Google sign-in cancelled/);
    assert.doesNotMatch(markup, /cancelled or denied/i);
  });
});
