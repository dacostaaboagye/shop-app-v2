import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminUserAccessDetail } from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UserAccessSummaryCard } from "./user-access-detail-body";

Object.assign(globalThis, { React });

describe("UserAccessSummaryCard", () => {
  it("renders uploaded user images in the access summary surface", () => {
    const markup = renderToStaticMarkup(
      <UserAccessSummaryCard user={userAccessDetail()} />,
    );

    assert.match(markup, /https:\/\/cdn\.example\.com\/users\/efua\.jpg/);
    assert.match(markup, /Efua Ansah profile image/);
    assert.match(markup, /button/);
  });

  it("falls back to initials when the user has no uploaded image", () => {
    const markup = renderToStaticMarkup(
      <UserAccessSummaryCard
        user={userAccessDetail({ primaryImageUrl: null })}
      />,
    );

    assert.match(markup, /EA/);
    assert.match(markup, /data-slot="avatar-fallback"/);
  });
});

function userAccessDetail(
  overrides: Partial<AdminUserAccessDetail> = {},
): AdminUserAccessDetail {
  return {
    assignedLocations: [
      { locationName: "Airport Branch", locationSlug: "airport-branch" },
    ],
    availablePortals: ["manager"],
    effectivePermissions: [],
    email: "efua@example.com",
    firstName: "Efua",
    lastLoginAt: "2026-04-26T09:00:00.000Z",
    lastName: "Ansah",
    preferredPortal: "manager",
    primaryImageUrl: "https://cdn.example.com/users/efua.jpg",
    recentActivity: [],
    requiresPasswordChange: false,
    roleAssignments: [],
    slug: "efua-ansah",
    status: "active",
    userOverrides: [],
    ...overrides,
  };
}
