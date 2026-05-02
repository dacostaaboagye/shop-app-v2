import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChangeLogEntry as ChangeLogEntryType } from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangeLogEntry } from "./change-log-entry";

Object.assign(globalThis, { React });

describe("ChangeLogEntry", () => {
  it("renders the archived badge with token-driven muted tone", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry entry={makeEntry({ operation: "archived" })} />,
    );

    assert.match(markup, /Archived/);
    assert.match(markup, /text-muted-foreground/);
    assert.match(markup, /Akosua Boateng/);
  });

  it("renders an updated entry and surfaces both before and after when expanded", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry
        defaultExpanded={true}
        entry={makeEntry({
          after: { name: "Sterling Silver Ring" },
          before: { name: "Silver Ring" },
          changedFields: ["name"],
          operation: "updated",
        })}
      />,
    );

    assert.match(markup, /Updated/);
    assert.match(markup, /Silver Ring/);
    assert.match(markup, /Sterling Silver Ring/);
    assert.match(markup, /Before/);
    assert.match(markup, /After/);
  });

  it("hides the diff body when collapsed by default", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry
        entry={makeEntry({
          after: { name: "Two" },
          before: { name: "One" },
          changedFields: ["name"],
          operation: "updated",
        })}
      />,
    );

    assert.match(markup, /Show changes/);
    assert.doesNotMatch(markup, /Before/);
  });

  it("shows the via-product hint when a parent product event is surfaced through this row", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry
        entry={makeEntry({
          entityType: "product_variant",
          parentEntityRef: "blue-mug",
          parentEntityType: "catalog_product",
        })}
      />,
    );

    assert.match(markup, /via product/);
  });

  it("omits the via-product hint when no parent is set", () => {
    const markup = renderToStaticMarkup(<ChangeLogEntry entry={makeEntry()} />);

    assert.doesNotMatch(markup, /via product/);
  });

  it("omits the diff toggle for entries with no changed fields", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry
        entry={makeEntry({ changedFields: [], operation: "archived" })}
      />,
    );

    assert.doesNotMatch(markup, /Show changes/);
  });

  it("renders the actor avatar image when actorAvatarUrl is provided", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry
        entry={makeEntry({
          actorAvatarUrl: "https://cdn.example.com/avatars/akosua.jpg",
        })}
      />,
    );

    assert.match(markup, /data-slot="avatar-image"/);
    assert.match(
      markup,
      /src="https:\/\/cdn\.example\.com\/avatars\/akosua\.jpg"/,
    );
  });

  it("falls back to actor initials when actorAvatarUrl is null", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry
        entry={makeEntry({
          actorAvatarUrl: null,
          actorName: "Akosua Boateng",
        })}
      />,
    );

    assert.match(markup, /data-slot="avatar-fallback"/);
    assert.match(markup, />AB</);
    assert.doesNotMatch(markup, /data-slot="avatar-image"/);
  });

  it("wraps the actor name in a link to the user profile", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry entry={makeEntry({ actorSlug: "akosua-boateng" })} />,
    );

    assert.match(markup, /href="\/admin\/users\/akosua-boateng"/);
    assert.match(
      markup,
      /<a [^>]*href="\/admin\/users\/akosua-boateng"[^>]*>Akosua Boateng<\/a>/,
    );
  });

  it("renders the actor name as plain text when actorSlug is empty", () => {
    const markup = renderToStaticMarkup(
      <ChangeLogEntry entry={makeEntry({ actorSlug: "" })} />,
    );

    assert.match(markup, /Akosua Boateng/);
    assert.doesNotMatch(markup, /href="\/admin\/users\//);
  });
});

function makeEntry(
  overrides: Partial<ChangeLogEntryType> = {},
): ChangeLogEntryType {
  return {
    actorAvatarUrl: null,
    actorName: "Akosua Boateng",
    actorSlug: "akosua-boateng",
    after: null,
    before: null,
    changedFields: [],
    entityRef: "blue-mug",
    entityType: "catalog_product",
    occurredAt: "2026-04-29T10:00:00.000Z",
    operation: "created",
    parentEntityRef: null,
    parentEntityType: null,
    ...overrides,
  };
}
