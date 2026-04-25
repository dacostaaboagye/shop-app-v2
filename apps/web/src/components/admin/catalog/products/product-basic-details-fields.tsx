"use client";

import type { AdminBrandSummary, AdminCategorySummary } from "@shop/contracts";
import type { ReactNode } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductField = {
  handleBlur: () => void;
  handleChange: (value: string) => void;
  name: string;
  state: {
    meta: {
      errors: unknown[];
      isBlurred: boolean;
      isDirty: boolean;
    };
    value: string;
  };
};

type ProductDetailsForm = {
  Field: (props: {
    children: (field: ProductField) => ReactNode;
    name: string;
    validators?: unknown;
  }) => ReactNode;
};

export function ProductBasicDetailsFields({
  brands,
  categories,
  form,
  wasSubmitted,
}: {
  brands: AdminBrandSummary[];
  categories: AdminCategorySummary[];
  form: unknown;
  wasSubmitted: boolean;
}) {
  const productForm = form as ProductDetailsForm;

  return (
    <FieldGroup>
      <productForm.Field
        name="name"
        validators={{
          onBlur: ({ value }: { value: string }) =>
            value.trim() ? undefined : "Enter a product name.",
          onSubmit: ({ value }: { value: string }) =>
            value.trim() ? undefined : "Enter a product name.",
        }}
      >
        {(field) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Name"
            showErrors={
              (field.state.meta.isDirty && field.state.meta.isBlurred) ||
              wasSubmitted
            }
          >
            <Input
              id={field.name}
              maxLength={200}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Omaya 1819 Backpack"
              value={field.state.value}
            />
          </AppFormField>
        )}
      </productForm.Field>

      <productForm.Field name="brandSlug">
        {(field) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Brand"
            showErrors={wasSubmitted}
          >
            <Select
              onValueChange={field.handleChange}
              value={field.state.value || "none"}
            >
              <SelectTrigger id={field.name}>
                <SelectValue placeholder="No brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No brand</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.slug} value={b.slug}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppFormField>
        )}
      </productForm.Field>

      <productForm.Field name="categorySlug">
        {(field) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Category"
            showErrors={wasSubmitted}
          >
            <Select
              onValueChange={field.handleChange}
              value={field.state.value || "none"}
            >
              <SelectTrigger id={field.name}>
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppFormField>
        )}
      </productForm.Field>

      <productForm.Field name="status">
        {(field) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Status"
            showErrors={wasSubmitted}
          >
            <Select
              onValueChange={(val) =>
                field.handleChange(val as "active" | "archived")
              }
              value={field.state.value}
            >
              <SelectTrigger id={field.name}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </AppFormField>
        )}
      </productForm.Field>
    </FieldGroup>
  );
}
