"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { VariantFormField } from "./variant-form.field";
import type { VariantFormApi } from "./variant-form.api";
import {
  attributeLines,
  requiredString,
  type VariantFormValues,
} from "./variant-form.support";

type VariantFormCoreFieldsProps = {
  form: VariantFormApi;
  showErrors: boolean;
};

export function VariantFormCoreFields({
  form,
  showErrors,
}: VariantFormCoreFieldsProps) {
  return (
    <FieldGroup>
      <form.Field
        name="name"
        validators={requiredString("Enter a variant name.")}
      >
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Variant name"
            showErrors={
              (field.state.meta.isDirty && field.state.meta.isBlurred) ||
              showErrors
            }
          >
            <Input
              id={field.name}
              maxLength={160}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Size M / Red"
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field name="sku" validators={requiredString("Enter a SKU.")}>
        {(field: VariantFormField) => (
          <AppFormField
            description="Must remain globally unique across all variants."
            errors={field.state.meta.errors}
            inputId={field.name}
            label="SKU"
            showErrors={
              (field.state.meta.isDirty && field.state.meta.isBlurred) ||
              showErrors
            }
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

      <form.Field name="unitOfMeasure">
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Unit of measure"
            showErrors={showErrors}
          >
            <Input
              id={field.name}
              maxLength={40}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="each"
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field name="status">
        {(field: VariantFormField) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Status"
            showErrors={showErrors}
          >
            <Select
              id={field.name}
              onChange={(event) => {
                const status = event.target.value as VariantFormValues["status"];
                field.handleChange(status);
                if (status === "archived") {
                  form.setFieldValue("isDefault", false);
                }
              }}
              value={String(field.state.value)}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </AppFormField>
        )}
      </form.Field>

      <form.Field name="isDefault">
        {(field: VariantFormField) => (
          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 transition-colors has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5">
              <input
                checked={Boolean(field.state.value)}
                className="mt-0.5 size-4 accent-primary"
                disabled={form.getFieldValue("status") === "archived"}
                id={field.name}
                onChange={(event) => field.handleChange(event.target.checked)}
                type="checkbox"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Default variant
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Archived variants cannot be the default variant.
                </p>
              </div>
            </label>
          </div>
        )}
      </form.Field>

      <form.Field
        name="attributesText"
        validators={attributeLines(
          "Use one attribute per line in the format Key: Value.",
        )}
      >
        {(field: VariantFormField) => (
          <AppFormField
            description="One per line, for example `Color: Red` or `Size: M`."
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Attributes"
            showErrors={showErrors}
          >
            <Textarea
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={"Color: Red\nSize: M"}
              rows={5}
              value={String(field.state.value)}
            />
          </AppFormField>
        )}
      </form.Field>
    </FieldGroup>
  );
}
