"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { VariantFormApi } from "./variant-form.api";
import type { VariantFormField } from "./variant-form.field";
import { moneyString } from "./variant-form.validators";

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

      <div className="col-span-1 border-t border-border/60 pb-2 pt-4 sm:col-span-2">
        <p className="text-sm font-medium">Taxation</p>
      </div>

      <form.Field name="isTaxable">
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Is taxable?"
            showErrors={showErrors}
          >
            <Select
              id={field.name}
              onChange={(e) =>
                field.handleChange(e.target.value as "inherit" | "yes" | "no")
              }
              value={field.state.value as string}
            >
              <option value="inherit">Inherit from product</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </AppFormField>
        )}
      </form.Field>

      <form.Field name="taxCategory">
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Tax category override"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              maxLength={80}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="e.g. Standard rate (leaves blank to inherit)"
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>
    </FieldGroup>
  );
}
