import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LocationStaffSummary } from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManagerStaffList } from "./manager-staff-list";

Object.assign(globalThis, { React });

describe("ManagerStaffList", () => {
  it("renders uploaded staff images inside the operational staff table", () => {
    const markup = renderToStaticMarkup(
      <ManagerStaffList
        items={[staffMember()]}
        locationName="Airport Branch"
        moneyProfile={{
          currencyCode: "GHS",
          currencyScale: 2,
          locale: "en-GH",
        }}
      />,
    );

    assert.match(markup, /https:\/\/cdn\.example\.com\/users\/kwesi\.jpg/);
    assert.match(markup, /Kwesi Mensah profile image/);
    assert.match(markup, /button/);
  });

  it("falls back to initials when a staff member has no uploaded image", () => {
    const markup = renderToStaticMarkup(
      <ManagerStaffList
        items={[staffMember({ primaryImageUrl: null })]}
        locationName="Airport Branch"
        moneyProfile={{
          currencyCode: "GHS",
          currencyScale: 2,
          locale: "en-GH",
        }}
      />,
    );

    assert.match(markup, /KM/);
    assert.match(markup, /data-slot="avatar-fallback"/);
  });
});

function staffMember(
  overrides: Partial<LocationStaffSummary> = {},
): LocationStaffSummary {
  return {
    activeAssignmentCount: 4,
    assignedAt: "2026-04-20T10:00:00.000Z",
    email: "kwesi@example.com",
    firstName: "Kwesi",
    lastName: "Mensah",
    lastSaleAt: "2026-04-21T08:00:00.000Z",
    netSalesAmount: "120.00",
    primaryImageUrl: "https://cdn.example.com/users/kwesi.jpg",
    roleName: "Manager",
    roleSlug: "manager",
    returnsCount: 1,
    returnsTotalAmount: "15.00",
    salesCount: 3,
    salesTotalAmount: "135.00",
    status: "active",
    userId: "11111111-1111-4111-8111-111111111111",
    userSlug: "kwesi-mensah",
    ...overrides,
  };
}
