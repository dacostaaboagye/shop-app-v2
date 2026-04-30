import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveExistingSuperAdminUser } from "../scripts/lib/super-admin-seed-support.js";

describe("resolveExistingSuperAdminUser", () => {
  it("returns null when no matching user exists", () => {
    assert.equal(resolveExistingSuperAdminUser([]), null);
  });

  it("returns the matched user when slug or email resolves to one row", () => {
    const row = {
      email: "admin@example.com",
      id: "11111111-1111-4111-8111-111111111111",
      slug: "super-admin",
    };

    assert.deepEqual(resolveExistingSuperAdminUser([row]), row);
  });

  it("allows duplicate matches when slug and email point to the same row", () => {
    const row = {
      email: "admin@example.com",
      id: "11111111-1111-4111-8111-111111111111",
      slug: "super-admin",
    };

    assert.deepEqual(resolveExistingSuperAdminUser([row, row]), row);
  });

  it("rejects ambiguous matches across different users", () => {
    assert.throws(
      () =>
        resolveExistingSuperAdminUser([
          {
            email: "old-admin@example.com",
            id: "11111111-1111-4111-8111-111111111111",
            slug: "super-admin",
          },
          {
            email: "admin@example.com",
            id: "22222222-2222-4222-8222-222222222222",
            slug: "regional-admin",
          },
        ]),
      /reserved slug and configured email belong to different users/i,
    );
  });
});
