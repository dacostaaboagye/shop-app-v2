import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminLocationStaffSummary } from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocationStaffRow } from "./location-staff-panel";

Object.assign(globalThis, { React });

describe("LocationStaffRow", () => {
  it("renders uploaded staff images through the shared avatar path", () => {
    const markup = renderToStaticMarkup(
      <LocationStaffRow member={staffMember()} />,
    );

    assert.match(markup, /https:\/\/cdn\.example\.com\/users\/akosua\.jpg/);
    assert.match(markup, /Akosua Boateng profile image/);
    assert.match(markup, /button/);
  });

  it("falls back to initials when no uploaded image exists", () => {
    const markup = renderToStaticMarkup(
      <LocationStaffRow member={staffMember({ primaryImageUrl: null })} />,
    );

    assert.match(markup, /AB/);
    assert.match(markup, /data-slot="avatar-fallback"/);
  });
});

function staffMember(
  overrides: Partial<AdminLocationStaffSummary> = {},
): AdminLocationStaffSummary {
  return {
    activeAssignmentCount: 2,
    assignedAt: "2026-04-25T08:00:00.000Z",
    email: "akosua@example.com",
    firstName: "Akosua",
    lastName: "Boateng",
    primaryImageUrl: "https://cdn.example.com/users/akosua.jpg",
    roleName: "Worker",
    roleSlug: "worker",
    status: "active",
    userSlug: "akosua-boateng",
    ...overrides,
  };
}
