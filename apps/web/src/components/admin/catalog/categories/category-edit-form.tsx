"use client";

import type { AdminCategorySummary } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  CatalogFormActions,
  CatalogFormCard,
  CatalogFormError,
} from "../catalog-form-surfaces";

type CategoryEditFormProps = {
  category: AdminCategorySummary;
  error: unknown;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    description: string | null;
    name: string;
    parentCategorySlug: string | null;
    status: "active" | "archived";
  }) => void;
  parentOptions: { name: string; slug: string }[];
};

export function CategoryEditForm({
  category,
  error,
  isPending,
  onCancel,
  onSubmit,
  parentOptions,
}: CategoryEditFormProps) {
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const form = useForm({
    defaultValues: {
      description: category.description ?? "",
      name: category.name,
      parentCategorySlug: category.parentCategorySlug ?? "",
      status: category.status,
    },
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      onSubmit({
        description: value.description.trim() || null,
        name: value.name.trim(),
        parentCategorySlug:
          value.parentCategorySlug === "none"
            ? null
            : value.parentCategorySlug.trim() || null,
        status: value.status,
      });
    },
  });

  return (
    <CatalogFormCard
      description="Update the category profile and parent relationship."
      title="Edit category"
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setWasSubmitted(true);
          void form.handleSubmit();
        }}
      >
        <CatalogFormError error={error} title="Unable to update category" />
        <FieldGroup>
          <form.Field
            name="name"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? undefined : "Enter a category name.",
              onSubmit: ({ value }) =>
                value.trim() ? undefined : "Enter a category name.",
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
                  maxLength={160}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
              </AppFormField>
            )}
          </form.Field>
          <form.Field name="parentCategorySlug">
            {(field) => (
              <AppFormField
                description="Optional. Makes this a sub-category."
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Parent category"
                showErrors={wasSubmitted}
              >
                <Select
                  onValueChange={field.handleChange}
                  value={field.state.value || "none"}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {parentOptions.map((categoryOption) => (
                      <SelectItem
                        key={categoryOption.slug}
                        value={categoryOption.slug}
                      >
                        {categoryOption.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AppFormField>
            )}
          </form.Field>
          <form.Field name="description">
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Description"
                showErrors={wasSubmitted}
              >
                <Textarea
                  id={field.name}
                  maxLength={2000}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
              </AppFormField>
            )}
          </form.Field>
          <form.Field name="status">
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Status"
                showErrors={wasSubmitted}
              >
                <Select
                  onValueChange={(value) =>
                    field.handleChange(value as "active" | "archived")
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
          </form.Field>
        </FieldGroup>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <CatalogFormActions
              canSubmit={canSubmit}
              isBusy={isSubmitting || isPending}
              onCancel={onCancel}
              submitLabel="Save changes"
              submittingLabel="Saving..."
            />
          )}
        </form.Subscribe>
      </form>
    </CatalogFormCard>
  );
}
