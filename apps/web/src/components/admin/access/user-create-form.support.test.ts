import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addRoleAssignment,
  createRoleAssignmentValue,
  filterUserCreateRoles,
  GLOBAL_LOCATION_VALUE,
  removeRoleAssignment,
  toCreateUserRequest,
  updateRoleAssignment,
  validateEmail,
  validateName,
  validateRoleAssignments,
} from "./user-create-form.support";

describe("user-create-form support", () => {
  it("maps trimmed form values to the admin create-user request", () => {
    const request = toCreateUserRequest({
      email: " Worker@Example.COM ",
      firstName: " Ama ",
      lastName: " Mensah ",
      profileImage: null,
      reason: " New hire ",
      roleAssignments: [
        {
          clientId: "assignment-1",
          locationSlug: "accra-central",
          roleSlug: "worker",
        },
        {
          clientId: "assignment-2",
          locationSlug: GLOBAL_LOCATION_VALUE,
          roleSlug: "admin",
        },
      ],
    });

    assert.deepEqual(request, {
      email: "worker@example.com",
      firstName: "Ama",
      lastName: "Mensah",
      reason: "New hire",
      roleAssignments: [
        { locationSlug: "accra-central", roleSlug: "worker" },
        { locationSlug: null, roleSlug: "admin" },
      ],
    });
  });

  it("requires location scope for manager and worker roles", () => {
    assert.equal(
      validateRoleAssignments([
        {
          clientId: "assignment-1",
          locationSlug: GLOBAL_LOCATION_VALUE,
          roleSlug: "worker",
        },
      ]),
      "Manager and worker roles must be assigned to a location.",
    );
    assert.equal(
      validateRoleAssignments([
        {
          clientId: "assignment-1",
          locationSlug: "accra-central",
          roleSlug: "manager",
        },
      ]),
      undefined,
    );
  });

  it("validates account identity fields", () => {
    assert.equal(validateEmail("worker@example.com"), undefined);
    assert.equal(validateEmail("not-an-email"), "Enter a valid email address.");
    assert.equal(validateName("Ama", "a first name"), undefined);
    assert.equal(
      validateName("<script>", "a first name"),
      "A first name cannot include angle brackets.",
    );
  });

  it("adds, updates, and removes role assignment rows without clearing the last row", () => {
    const first = createRoleAssignmentValue(1);
    const second = addRoleAssignment([first])[1];

    assert.equal(second?.clientId, "role-assignment-2");

    const updated = updateRoleAssignment([first, second], first.clientId, {
      roleSlug: "admin",
    });
    assert.equal(updated[0]?.roleSlug, "admin");

    assert.deepEqual(removeRoleAssignment([first], first.clientId), [first]);
    assert.deepEqual(removeRoleAssignment([first, second], first.clientId), [
      second,
    ]);
  });

  it("filters role choices when a staff surface supplies an allow-list", () => {
    const roles = [
      createRoleSummary("admin", "Admin"),
      createRoleSummary("agent", "Agent"),
      createRoleSummary("supplier", "Supplier"),
      createRoleSummary("worker", "Worker"),
    ];

    assert.deepEqual(
      filterUserCreateRoles(roles, ["admin", "worker"]).map(
        (role) => role.slug,
      ),
      ["admin", "worker"],
    );
    assert.deepEqual(
      filterUserCreateRoles(roles).map((role) => role.slug),
      ["admin", "agent", "supplier", "worker"],
    );
  });
});

function createRoleSummary(slug: string, name: string) {
  return {
    assignedUserCount: 0,
    description: `${name} role`,
    isSystem: true,
    name,
    permissionCount: 1,
    slug,
  };
}
