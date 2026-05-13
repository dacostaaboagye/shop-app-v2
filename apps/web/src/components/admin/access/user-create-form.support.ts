import type {
  AdminCreateUserRequest,
  AdminCreateUserRoleAssignmentRequest,
  AdminRoleSummary,
} from "@shop/contracts";
import { roleRequiresLocationScope } from "./user-access-manage-support";

export const GLOBAL_LOCATION_VALUE = "__global__";
export const MAX_ROLE_ASSIGNMENTS = 10;

export type UserCreateRoleAssignmentValue = {
  clientId: string;
  locationSlug: string;
  roleSlug: string;
};

export type UserCreateFormValues = {
  email: string;
  firstName: string;
  lastName: string;
  profileImage: File | null;
  reason: string;
  roleAssignments: UserCreateRoleAssignmentValue[];
};

export const DEFAULT_USER_CREATE_VALUES: UserCreateFormValues = {
  email: "",
  firstName: "",
  lastName: "",
  profileImage: null,
  reason: "",
  roleAssignments: [createRoleAssignmentValue(1)],
};

export function createRoleAssignmentValue(
  index: number,
): UserCreateRoleAssignmentValue {
  return {
    clientId: `role-assignment-${index}`,
    locationSlug: GLOBAL_LOCATION_VALUE,
    roleSlug: "",
  };
}

export function toCreateUserRequest(
  values: UserCreateFormValues,
): AdminCreateUserRequest {
  return {
    email: values.email.trim().toLowerCase(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    reason: values.reason.trim(),
    roleAssignments: values.roleAssignments.map(toRoleAssignmentRequest),
  };
}

export function validateRequired(value: string, message: string) {
  return value.trim() ? undefined : message;
}

export function validateName(value: string, label: string) {
  if (!value.trim()) {
    return `Enter ${label}.`;
  }

  if (/[<>]/.test(value)) {
    return `${capitalize(label)} cannot include angle brackets.`;
  }

  return undefined;
}

export function validateEmail(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "Enter an email address.";
  }

  if (
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return "Enter a valid email address.";
  }

  return undefined;
}

export function validateRoleAssignments(
  assignments: readonly UserCreateRoleAssignmentValue[],
) {
  if (assignments.length === 0) {
    return "Add at least one role assignment.";
  }

  if (assignments.length > MAX_ROLE_ASSIGNMENTS) {
    return `Add no more than ${MAX_ROLE_ASSIGNMENTS} role assignments.`;
  }

  for (const assignment of assignments) {
    if (!assignment.roleSlug) {
      return "Select a role for every assignment.";
    }

    if (
      roleRequiresLocationScope(assignment.roleSlug) &&
      assignment.locationSlug === GLOBAL_LOCATION_VALUE
    ) {
      return "Manager and worker roles must be assigned to a location.";
    }
  }

  return undefined;
}

export function addRoleAssignment(
  assignments: readonly UserCreateRoleAssignmentValue[],
): UserCreateRoleAssignmentValue[] {
  if (assignments.length >= MAX_ROLE_ASSIGNMENTS) {
    return [...assignments];
  }

  return [...assignments, createRoleAssignmentValue(assignments.length + 1)];
}

export function removeRoleAssignment(
  assignments: readonly UserCreateRoleAssignmentValue[],
  clientId: string,
): UserCreateRoleAssignmentValue[] {
  const next = assignments.filter(
    (assignment) => assignment.clientId !== clientId,
  );
  return next.length > 0 ? next : [...assignments];
}

export function updateRoleAssignment(
  assignments: readonly UserCreateRoleAssignmentValue[],
  clientId: string,
  patch: Partial<
    Pick<UserCreateRoleAssignmentValue, "locationSlug" | "roleSlug">
  >,
): UserCreateRoleAssignmentValue[] {
  return assignments.map((assignment) =>
    assignment.clientId === clientId ? { ...assignment, ...patch } : assignment,
  );
}

export function filterUserCreateRoles(
  roles: readonly AdminRoleSummary[],
  allowedRoleSlugs?: readonly string[],
): AdminRoleSummary[] {
  if (!allowedRoleSlugs) {
    return [...roles];
  }

  const allowed = new Set(allowedRoleSlugs);
  return roles.filter((role) => allowed.has(role.slug));
}

function toRoleAssignmentRequest(
  assignment: UserCreateRoleAssignmentValue,
): AdminCreateUserRoleAssignmentRequest {
  return {
    locationSlug:
      assignment.locationSlug === GLOBAL_LOCATION_VALUE
        ? null
        : assignment.locationSlug,
    roleSlug: assignment.roleSlug,
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
