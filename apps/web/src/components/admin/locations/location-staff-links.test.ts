import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAdminStaffLocationHref,
  getAdminStaffUserHref,
} from "./location-staff-links";

describe("location staff links", () => {
  it("links location staff summaries to the operational staff page", () => {
    assert.equal(
      getAdminStaffLocationHref("central warehouse"),
      "/admin/staff?locationSlug=central%20warehouse",
    );
  });

  it("links staff rows to the admin user profile", () => {
    assert.equal(
      getAdminStaffUserHref("ama mensah"),
      "/admin/users/ama%20mensah",
    );
  });
});
