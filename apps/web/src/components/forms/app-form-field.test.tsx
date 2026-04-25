import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Input } from "@/components/ui/input";
import { AppFormField } from "./app-form-field";

Object.assign(globalThis, { React });

describe("AppFormField", () => {
  it("renders the field shell and surfaced errors", () => {
    const markup = renderToStaticMarkup(
      <AppFormField
        description="Use your company email."
        errors={["Enter an email address."]}
        inputId="email"
        label="Email"
      >
        <Input id="email" />
      </AppFormField>,
    );

    assert.match(markup, /Email/);
    assert.match(markup, /Use your company email\./);
    assert.match(markup, /Enter an email address\./);
    assert.match(markup, /form-field-label/);
    assert.match(markup, /form-field-description/);
    assert.match(markup, /form-field-error/);
  });
});
