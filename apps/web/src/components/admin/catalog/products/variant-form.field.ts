export type VariantFormField = {
  handleBlur: () => void;
  handleChange: (value: string | boolean) => void;
  name: string;
  state: {
    meta: {
      errors: ReadonlyArray<unknown> | null;
      isBlurred?: boolean;
      isDirty?: boolean;
    };
    value: string | boolean;
  };
};
