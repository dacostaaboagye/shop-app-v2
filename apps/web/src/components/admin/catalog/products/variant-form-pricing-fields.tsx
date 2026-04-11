"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { VariantFormField } from "./variant-form.field";
import type { VariantFormApi } from "./variant-form.api";
import { moneyString } from "./variant-form.support";

type VariantFormPricingFieldsProps = {
  canSeeCostPrice: boolean;
  form: VariantFormApi;
  showErrors: boolean;
};

export function VariantFormPricingFields({
  canSeeCostPrice,
  form,
  showErrors,
}: VariantFormPricingFieldsProps) {
  return (
    <FieldGroup>
      <form.Field
        name="sellingPrice"
        validators={moneyString("Enter a valid price like 12.50.")}
      >
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Selling price"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              inputMode="decimal"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="0.00"
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>

      {canSeeCostPrice ? (
        <form.Field
          name="costPrice"
          validators={moneyString("Enter a valid price like 9.75.")}
        >
          {(field: VariantFormField) => (
            <AppFormField
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Cost price"
              showErrors={showErrors}
            >
              <Input
                id={field.name}
                inputMode="decimal"
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="0.00"
                value={String(field.state.value)}
              />
            </AppFormField>
          )}
        </form.Field>
      ) : null}

      <form.Field name="barcode">
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Barcode"
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

      <form.Field name="manufacturerPartNumber">
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Manufacturer part number"
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
    </FieldGroup>
  );
}
