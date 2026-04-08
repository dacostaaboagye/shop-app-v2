import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LoginPreviewForm } from "./login-preview-form";

Object.assign(globalThis, { React });

describe("LoginPreviewForm", () => {
  it("renders the TanStack Form login baseline", () => {
    const markup = renderToStaticMarkup(<LoginPreviewForm />);

    assert.match(markup, /Email/);
    assert.match(markup, /Password/);
    assert.match(markup, /Sign In/);
  });
});
