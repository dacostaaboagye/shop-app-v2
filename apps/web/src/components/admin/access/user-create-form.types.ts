import type { ReactNode } from "react";
import type {
  UserCreateFormValues,
  UserCreateRoleAssignmentValue,
} from "./user-create-form.support";

type UserCreateFieldValue =
  | File
  | null
  | string
  | UserCreateRoleAssignmentValue[];

export type UserCreateField = {
  handleBlur: () => void;
  handleChange: (value: UserCreateFieldValue) => void;
  name: string;
  state: {
    meta: {
      errors: unknown[];
      isBlurred: boolean;
      isDirty: boolean;
    };
    value: UserCreateFieldValue;
  };
};

export type UserCreateFormState = {
  canSubmit: boolean;
  isSubmitting: boolean;
};

export type UserCreateFormHandle = {
  Field: (props: {
    children: (field: UserCreateField) => ReactNode;
    name: keyof UserCreateFormValues;
    validators?: unknown;
  }) => ReactNode;
  Subscribe: (props: {
    children: (value: unknown) => ReactNode;
    selector: (state: UserCreateFormState) => unknown;
  }) => ReactNode;
  handleSubmit: () => Promise<void> | void;
};

export type UserCreateMutationState = {
  error: unknown;
  isError: boolean;
  isPending: boolean;
};
