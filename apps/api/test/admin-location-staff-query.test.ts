import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeLocationManagerStaff } from "../src/modules/admin/postgres-admin-location-staff-query.js";

describe("admin location staff query", () => {
  it("keeps the configured location manager visible when no active manager role exists", () => {
    const items = mergeLocationManagerStaff({
      assignedAt: "2026-04-19T10:00:00.000Z",
      items: [
        {
          activeAssignmentCount: 2,
          assignedAt: "2026-04-20T10:00:00.000Z",
          email: "worker@example.com",
          firstName: "Ama",
          lastName: "Mensah",
          primaryImageUrl: null,
          roleName: "Worker",
          roleSlug: "worker",
          status: "active",
          userSlug: "ama-mensah",
        },
      ],
      manager: {
        email: "manager@example.com",
        firstName: "Kwame",
        lastName: "Boateng",
        primaryImageUrl: "https://cdn.example.com/users/kwame.jpg",
        status: "active",
        userSlug: "kwame-boateng",
      },
    });

    assert.equal(items[0]?.roleSlug, "manager");
    assert.equal(items[0]?.userSlug, "kwame-boateng");
    assert.equal(
      items[0]?.primaryImageUrl,
      "https://cdn.example.com/users/kwame.jpg",
    );
    assert.equal(items[1]?.roleSlug, "worker");
  });

  it("does not duplicate a manager already present through role assignments", () => {
    const items = mergeLocationManagerStaff({
      assignedAt: "2026-04-19T10:00:00.000Z",
      items: [
        {
          activeAssignmentCount: 0,
          assignedAt: "2026-04-20T10:00:00.000Z",
          email: "manager@example.com",
          firstName: "Kwame",
          lastName: "Boateng",
          primaryImageUrl: null,
          roleName: "Manager",
          roleSlug: "manager",
          status: "active",
          userSlug: "kwame-boateng",
        },
      ],
      manager: {
        email: "manager@example.com",
        firstName: "Kwame",
        lastName: "Boateng",
        primaryImageUrl: "https://cdn.example.com/users/kwame.jpg",
        status: "active",
        userSlug: "kwame-boateng",
      },
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.roleSlug, "manager");
    assert.equal(items[0]?.primaryImageUrl, null);
  });
});
