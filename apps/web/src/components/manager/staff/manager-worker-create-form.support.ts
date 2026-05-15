import type { ManagerCreateWorkerRequest } from "@shop/contracts";
import {
  type UserCreateFormValues,
  validateEmail,
  validateName,
  validateRequired,
} from "@/components/admin/access/user-create-form.support";

export type ManagerWorkerCreateFormValues = UserCreateFormValues;

export const DEFAULT_MANAGER_WORKER_CREATE_VALUES: ManagerWorkerCreateFormValues =
  {
    email: "",
    firstName: "",
    lastName: "",
    profileImage: null,
    reason: "",
    roleAssignments: [],
  };

export function toManagerCreateWorkerRequest(input: {
  locationSlug: string;
  values: ManagerWorkerCreateFormValues;
}): ManagerCreateWorkerRequest {
  return {
    email: input.values.email.trim().toLowerCase(),
    firstName: input.values.firstName.trim(),
    lastName: input.values.lastName.trim(),
    locationSlugs: [input.locationSlug],
    reason: input.values.reason.trim(),
  };
}

export function validateManagerWorkerCreateValues(
  values: ManagerWorkerCreateFormValues,
) {
  return (
    validateName(values.firstName, "a first name") ??
    validateName(values.lastName, "a last name") ??
    validateEmail(values.email) ??
    validateRequired(values.reason, "Enter an audit reason.")
  );
}
