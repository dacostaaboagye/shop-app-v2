import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAvailablePortals,
  getPortalSelectionState,
  getPreferredPortal,
} from "./portals";

describe("portals", () => {
  it("returns only valid available portals", () => {
    assert.deepEqual(
      getAvailablePortals({
        availablePortals: ["admin", "worker", "basic_user"] as never,
      }),
      ["admin", "worker"],
    );
  });

  it("ignores a preferred portal that is not in the available portal list", () => {
    assert.equal(
      getPreferredPortal({
        availablePortals: ["worker"],
        preferredPortal: "admin",
      }),
      null,
    );
  });

  it("returns the preferred portal when it is available", () => {
    assert.deepEqual(
      getPortalSelectionState({
        availablePortals: ["admin", "manager"],
        preferredPortal: "manager",
      }),
      {
        availablePortals: ["admin", "manager"],
        preferredPortal: "manager",
      },
    );
  });
});
