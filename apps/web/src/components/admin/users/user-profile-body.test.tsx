import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminUserAccessDetail } from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UserProfileIdentityCard } from "./user-profile-body";

Object.assign(globalThis, { React });

describe("UserProfileIdentityCard", () => {
  it("renders uploaded people images through the shared preview behavior", () => {
    const markup = renderToStaticMarkup(
      <UserProfileIdentityCard user={userAccessDetail()} />,
    );

    assert.match(markup, /https:\/\/cdn\.example\.com\/users\/adwoa\.jpg/);
    assert.match(markup, /Adwoa Sarpong/);
    assert.match(markup, /button/);
  });

  it("falls back to initials when the user has no uploaded image", () => {
    const markup = renderToStaticMarkup(
      <UserProfileIdentityCard
        user={userAccessDetail({ primaryImageUrl: null })}
      />,
    );

    assert.match(markup, /AS/);
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
    email: "adwoa@example.com",
    firstName: "Adwoa",
    lastLoginAt: "2026-04-26T09:00:00.000Z",
    lastName: "Sarpong",
    preferredPortal: "manager",
    primaryImageUrl: "https://cdn.example.com/users/adwoa.jpg",
    recentActivity: [],
    requiresPasswordChange: false,
    roleAssignments: [
      {
        assignedAt: "2026-04-01T09:00:00.000Z",
        assignedByName: "Admin User",
        locationName: "Airport Branch",
        locationSlug: "airport-branch",
        roleName: "Manager",
        roleSlug: "manager",
      },
    ],
    slug: "adwoa-sarpong",
    status: "active",
    userOverrides: [],
    ...overrides,
  };
}
