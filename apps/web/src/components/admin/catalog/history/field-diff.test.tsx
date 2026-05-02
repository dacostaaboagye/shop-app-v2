import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FieldDiff } from "./field-diff";

Object.assign(globalThis, { React });

describe("FieldDiff", () => {
  it("renders a string change inline on both sides", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ name: "Sterling Silver" }}
        before={{ name: "Silver" }}
        changedFields={["name"]}
      />,
    );

    assert.match(markup, /Silver/);
    assert.match(markup, /Sterling Silver/);
    assert.match(markup, /Name/);
    assert.match(markup, /line-through/);
  });

  it("renders a boolean change as Yes / No badges", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ isActive: true }}
        before={{ isActive: false }}
        changedFields={["isActive"]}
      />,
    );

    assert.match(markup, /Yes/);
    assert.match(markup, /No/);
    assert.match(markup, /data-slot="badge"/);
  });

  it("renders a null value as a muted em-dash", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ description: "Refreshed" }}
        before={{ description: null }}
        changedFields={["description"]}
      />,
    );

    assert.match(markup, /—/);
    assert.match(markup, /italic/);
    assert.match(markup, /Refreshed/);
  });

  it("renders array and object values inside a pre block", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ tags: ["new", "premium"] }}
        before={{ tags: ["new"] }}
        changedFields={["tags"]}
      />,
    );

    assert.match(markup, /<pre/);
    assert.match(markup, /premium/);
  });

  it("uses mobile-first stacking grid that expands on md+", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ name: "B" }}
        before={{ name: "A" }}
        changedFields={["name"]}
      />,
    );

    // grid-cols-1 is the mobile stack; md:grid-cols-[8rem_1fr_1fr] is the
    // desktop expansion. Both must be present so the grid widens at md
    // without collapsing the mobile default.
    assert.match(markup, /grid-cols-1/);
    assert.match(markup, /md:grid-cols-/);
  });

  it("returns the no-changes hint when the changed-fields list is empty", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff after={null} before={null} changedFields={[]} />,
    );

    assert.match(markup, /No field-level changes recorded/);
  });
});
