import type { ReactNode } from "react";
import type { LocationCreateFormValues } from "./location-create-page.support";

type LocationFieldValue = boolean | number | string | undefined;

export type LocationField = {
  handleBlur: () => void;
  handleChange: (value: LocationFieldValue) => void;
  name: string;
  state: {
    meta: {
      errors: unknown[];
      isBlurred: boolean;
      isDirty: boolean;
    };
    value: LocationFieldValue;
  };
};

export type LocationFormState = {
  canSubmit: boolean;
  isSubmitting: boolean;
};

export type LocationCreateFormHandle = {
  Field: (props: {
    children: (field: LocationField) => ReactNode;
    name: string;
    validators?: unknown;
  }) => ReactNode;
  Subscribe: (props: {
    children: (value: unknown) => ReactNode;
    selector: (state: LocationFormState) => unknown;
  }) => ReactNode;
  getFieldValue: <K extends keyof LocationCreateFormValues>(
    name: K,
  ) => LocationCreateFormValues[K];
  handleSubmit: () => Promise<void> | void;
  setFieldValue: <K extends keyof LocationCreateFormValues>(
    name: K,
    value: LocationCreateFormValues[K],
  ) => void;
};

export type LocationCreateMutationState = {
  error: unknown;
  isError: boolean;
};

export type LocationMapValue = Pick<
  LocationCreateFormValues,
  "address" | "latitude" | "longitude"
>;
