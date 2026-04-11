import type { ReactNode } from "react";
import type { VariantFormField } from "./variant-form.field";
import type { VariantFormValues } from "./variant-form.support";

export type VariantFormApi = {
  Field: (props: {
    children: (field: VariantFormField) => ReactNode | Promise<ReactNode>;
    name: keyof VariantFormValues;
    validators?: object;
  }) => ReactNode | Promise<ReactNode>;
  getFieldValue: <TName extends keyof VariantFormValues>(
    name: TName,
  ) => VariantFormValues[TName];
  setFieldValue: <TName extends keyof VariantFormValues>(
    name: TName,
    value: VariantFormValues[TName],
  ) => void;
};
