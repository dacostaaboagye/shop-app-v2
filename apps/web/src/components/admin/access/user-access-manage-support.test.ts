import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDialogMeta,
  getReasonDialogKey,
  isReasonDialogPending,
  roleRequiresLocationScope,
} from "./user-access-manage-support";

describe("user access manage support", () => {
  it("marks manager and worker roles as location scoped", () => {
    assert.equal(roleRequiresLocationScope("manager"), true);
    assert.equal(roleRequiresLocationScope("worker"), true);
    assert.equal(roleRequiresLocationScope("admin"), false);
  });

  it("explains location scope in assign-role dialog copy when required", () => {
    assert.match(
      getDialogMeta({
        kind: "assign-role",
        roleName: "Manager",
        roleSlug: "manager",
      }).description,
      /require a location scope/i,
    );
    assert.doesNotMatch(
      getDialogMeta({
        kind: "assign-role",
        roleName: "Admin",
        roleSlug: "admin",
      }).description,
      /require a location scope/i,
    );
  });

  it("includes location scope in dialog keys for scoped revocations", () => {
    assert.equal(
      getReasonDialogKey({
        assignment: {
          assignedAt: "2026-04-17T00:00:00.000Z",
          assignedByName: "Admin User",
          locationName: "Downtown Store",
          locationSlug: "downtown-store",
          roleName: "Worker",
          roleSlug: "worker",
        },
        kind: "revoke-role",
      }),
      "revoke-role:worker:downtown-store",
    );
  });

  it("keeps the dialog pending while either the form or mutation is pending", () => {
    assert.equal(
      isReasonDialogPending({
        formIsSubmitting: true,
        mutationIsPending: false,
      }),
      true,
    );
    assert.equal(
      isReasonDialogPending({
        formIsSubmitting: false,
        mutationIsPending: true,
      }),
      true,
    );
    assert.equal(
      isReasonDialogPending({
        formIsSubmitting: false,
        mutationIsPending: false,
      }),
      false,
    );
  });
});
