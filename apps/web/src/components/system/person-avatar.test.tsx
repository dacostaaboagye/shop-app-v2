import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PersonAvatar } from "./person-avatar";

Object.assign(globalThis, { React });

describe("PersonAvatar", () => {
  it("renders a preview image trigger when interactive image previews are enabled", () => {
    const markup = renderToStaticMarkup(
      <PersonAvatar
        firstName="Ama"
        imageUrl="https://cdn.example.com/users/ama.jpg"
        interactive
        lastName="Mensah"
      />,
    );

    assert.match(markup, /button/);
    assert.match(markup, /https:\/\/cdn\.example\.com\/users\/ama\.jpg/);
    assert.match(markup, /Ama Mensah profile image/);
  });

  it("renders a non-interactive avatar image when previews are disabled", () => {
    const markup = renderToStaticMarkup(
      <PersonAvatar
        firstName="Ama"
        imageUrl="https://cdn.example.com/users/ama.jpg"
        interactive={false}
        lastName="Mensah"
      />,
    );

    assert.doesNotMatch(markup, /DialogTrigger/);
    assert.doesNotMatch(markup, /<button/);
    assert.match(markup, /data-slot="avatar-image"/);
    assert.match(markup, /https:\/\/cdn\.example\.com\/users\/ama\.jpg/);
  });

  it("falls back to initials when no image is available", () => {
    const markup = renderToStaticMarkup(
      <PersonAvatar firstName="Ama" imageUrl={null} lastName="Mensah" />,
    );

    assert.match(markup, /AM/);
    assert.match(markup, /data-slot="avatar-fallback"/);
  });
});
