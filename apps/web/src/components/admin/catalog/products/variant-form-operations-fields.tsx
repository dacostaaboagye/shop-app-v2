"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { VariantFormApi } from "./variant-form.api";
import type { VariantFormField } from "./variant-form.field";
import {
  positiveIntegerOrBlank,
  positiveNumberOrBlank,
} from "./variant-form.validators";

type VariantFormOperationsFieldsProps = {
  form: VariantFormApi;
  showErrors: boolean;
};

export function VariantFormOperationsFields({
  form,
  showErrors,
}: VariantFormOperationsFieldsProps) {
  return (
    <FieldGroup>
      <form.Field name="packagingType">
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Packaging type"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              maxLength={80}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="carton"
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field name="customsCode">
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Customs code"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              maxLength={80}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field
        name="weightGrams"
        validators={positiveIntegerOrBlank(
          "Weight must be a positive whole number.",
        )}
      >
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Weight (grams)"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              inputMode="numeric"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field
        name="dimensionsLength"
        validators={positiveNumberOrBlank("Length must be a positive number.")}
      >
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Length (cm)"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              inputMode="decimal"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field
        name="dimensionsWidth"
        validators={positiveNumberOrBlank("Width must be a positive number.")}
      >
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Width (cm)"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              inputMode="decimal"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field
        name="dimensionsHeight"
        validators={positiveNumberOrBlank("Height must be a positive number.")}
      >
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Height (cm)"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              inputMode="decimal"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>
    </FieldGroup>
  );
}
