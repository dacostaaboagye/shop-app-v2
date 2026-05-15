import type { ReactNode } from "react";
import type { CatalogIntakeDraftValues } from "./stock-take-catalog-intake.support";

export type CatalogIntakeFormField = {
  handleBlur: () => void;
  handleChange: (value: boolean | string) => void;
  name: string;
  state: {
    meta: {
      errors: ReadonlyArray<unknown> | null;
      isBlurred?: boolean;
      isDirty?: boolean;
    };
    value: boolean | string;
  };
};

export type CatalogIntakeFormApi = {
  Field: (props: {
    children: (field: CatalogIntakeFormField) => ReactNode | Promise<ReactNode>;
    name: keyof CatalogIntakeDraftValues;
    validators?: object;
  }) => ReactNode | Promise<ReactNode>;
};
