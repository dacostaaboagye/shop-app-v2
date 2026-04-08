"use client";

import type { ReactNode } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { getFormFieldMessages } from "@/lib/forms/field-errors";

type AppFormFieldProps = {
  children: ReactNode;
  description?: string;
  errors?: ReadonlyArray<unknown> | null;
  inputId: string;
  label: string;
  showErrors?: boolean;
};

export function AppFormField({
  children,
  description,
  errors,
  inputId,
  label,
  showErrors = true,
}: AppFormFieldProps) {
  const messages = showErrors ? getFormFieldMessages(errors) : [];

  return (
    <Field data-invalid={messages.length ? true : undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <FieldContent>
        {children}
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
        <FieldError errors={messages.map((message) => ({ message }))} />
      </FieldContent>
    </Field>
  );
}
