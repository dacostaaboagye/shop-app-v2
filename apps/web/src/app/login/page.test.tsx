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
    assert.match(markup, /No account\?/i);
    assert.match(markup, /Create Account/);
  });

  it("renders the OAuth denial notice when Google sign-in is cancelled", async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({ oauth_error: "access_denied" }),
    });
    const markup = renderToStaticMarkup(<AppProviders>{page}</AppProviders>);

    assert.match(markup, /Google sign-in cancelled/);
    assert.match(markup, /cancelled or denied/i);
  });
});
