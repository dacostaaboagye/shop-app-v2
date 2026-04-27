import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LocationStaffSummary } from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssignmentWorkerGrid } from "./assignment-worker-grid";

Object.assign(globalThis, { React });

describe("AssignmentWorkerGrid", () => {
  it("renders worker images inside a non-interactive avatar in button-based selectors", () => {
    const markup = renderToStaticMarkup(
      <AssignmentWorkerGrid
        onSelect={() => undefined}
        selected={null}
        workers={[worker()]}
      />,
    );

    assert.match(markup, /https:\/\/cdn\.example\.com\/users\/ama\.jpg/);
    assert.match(markup, /data-slot="avatar-image"/);
    assert.doesNotMatch(markup, /DialogTrigger/);
  });

  it("renders initials when a worker has no uploaded image", () => {
    const markup = renderToStaticMarkup(
      <AssignmentWorkerGrid
        onSelect={() => undefined}
        selected={null}
        workers={[worker({ primaryImageUrl: null })]}
      />,
    );

    assert.match(markup, /AM/);
    assert.match(markup, /data-slot="avatar-fallback"/);
  });
});

function worker(
  overrides: Partial<LocationStaffSummary> = {},
): LocationStaffSummary {
  return {
    activeAssignmentCount: 4,
    assignedAt: "2026-04-20T10:00:00.000Z",
    email: "ama@example.com",
    firstName: "Ama",
    lastName: "Mensah",
    lastSaleAt: "2026-04-21T08:00:00.000Z",
    netSalesAmount: "120.00",
    primaryImageUrl: "https://cdn.example.com/users/ama.jpg",
    roleName: "Worker",
    roleSlug: "worker",
    returnsCount: 1,
    returnsTotalAmount: "15.00",
    salesCount: 3,
    salesTotalAmount: "135.00",
    status: "active",
    userId: "11111111-1111-4111-8111-111111111111",
    userSlug: "ama-mensah",
    ...overrides,
  };
}
