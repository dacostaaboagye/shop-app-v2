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
    assert.match(markup, /Changed field/);
    assert.doesNotMatch(markup, /line-through/);
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

  it("renders named referent objects by name and suppresses the ID", () => {
    const beforeId = "11111111-1111-4111-8111-111111111111";
    const afterId = "22222222-2222-4222-8222-222222222222";
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ category: { id: afterId, name: "Travel Bags" } }}
        before={{ category: { id: beforeId, name: "Crossbody Bags" } }}
        changedFields={["category"]}
      />,
    );

    assert.match(markup, /Crossbody Bags/);
    assert.match(markup, /Travel Bags/);
    assert.doesNotMatch(markup, new RegExp(beforeId));
    assert.doesNotMatch(markup, new RegExp(afterId));
  });

  it("renders public referent objects that only contain a name", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ category: { name: "Travel Bags" } }}
        before={{ category: { name: "Crossbody Bags" } }}
        changedFields={["category"]}
      />,
    );

    assert.match(markup, /Crossbody Bags/);
    assert.match(markup, /Travel Bags/);
  });

  it("suppresses partial referent objects that only contain a UUID", () => {
    const beforeId = "11111111-1111-4111-8111-111111111111";
    const afterId = "22222222-2222-4222-8222-222222222222";
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ category: { id: afterId } }}
        before={{ category: { id: beforeId, name: "" } }}
        changedFields={["category"]}
      />,
    );

    assert.match(markup, /Name not captured/);
    assert.doesNotMatch(markup, new RegExp(beforeId));
    assert.doesNotMatch(markup, new RegExp(afterId));
  });

  it("suppresses legacy UUID-only string snapshots", () => {
    const beforeId = "11111111-1111-4111-8111-111111111111";
    const afterId = "22222222-2222-4222-8222-222222222222";
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ categoryId: afterId }}
        before={{ categoryId: beforeId }}
        changedFields={["categoryId"]}
      />,
    );

    assert.match(markup, /Name not captured/);
    assert.match(markup, /Older history row\. ID hidden\./);
    assert.doesNotMatch(markup, new RegExp(beforeId));
    assert.doesNotMatch(markup, new RegExp(afterId));
  });

  it("uses mobile-first stacking grid that expands on md+", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff
        after={{ name: "B" }}
        before={{ name: "A" }}
        changedFields={["name"]}
      />,
    );

    // The grid stacks by default; md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
    // widens the before/to/after cards only on larger screens.
    assert.match(markup, /grid gap-3/);
    assert.match(markup, /md:grid-cols-/);
    assert.match(markup, />to</);
  });

  it("returns the no-changes hint when the changed-fields list is empty", () => {
    const markup = renderToStaticMarkup(
      <FieldDiff after={null} before={null} changedFields={[]} />,
    );

    assert.match(markup, /No field-level changes recorded/);
  });
});
