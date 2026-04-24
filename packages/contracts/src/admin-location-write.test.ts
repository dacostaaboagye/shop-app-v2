import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminCreateLocationRequestSchema,
  adminCreateLocationResponseSchema,
} from "./admin-location-write.js";

describe("admin location write contracts", () => {
  it("accepts a valid location create request", () => {
    const parsed = adminCreateLocationRequestSchema.parse({
      isFulfilmentEnabled: true,
      name: "Central Warehouse",
      status: "active",
      type: "warehouse",
    });

    assert.equal(parsed.type, "warehouse");
  });

  it("accepts a valid location create response", () => {
    const parsed = adminCreateLocationResponseSchema.parse({
      createdAt: "2026-04-09T12:00:00.000Z",
      isFulfilmentEnabled: true,
      managerName: null,
      name: "Central Warehouse",
      slug: "central-warehouse",
      staffCount: 0,
      status: "active",
      type: "warehouse",
      zoneCount: 0,
    });

    assert.equal(parsed.slug, "central-warehouse");
  });
});
