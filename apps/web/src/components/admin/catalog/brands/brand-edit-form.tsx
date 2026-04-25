"use client";

import type { AdminBrandSummary } from "@shop/contracts";
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

type BrandEditFormProps = {
  brand: AdminBrandSummary;
  error: unknown;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    description: string | null;
    name: string;
    status: "active" | "archived";
    website: string | null;
  }) => void;
};

export function BrandEditForm({
  brand,
  error,
  isPending,
  onCancel,
  onSubmit,
}: BrandEditFormProps) {
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const form = useForm({
    defaultValues: {
      description: brand.description ?? "",
      name: brand.name,
      status: brand.status,
      website: brand.website ?? "",
    },
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      onSubmit({
        description: value.description.trim() || null,
        name: value.name.trim(),
        status: value.status,
        website: value.website.trim() || null,
      });
    },
  });

  return (
    <CatalogFormCard
      description="Update the brand profile used across product assignments."
      title="Edit brand"
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
        <CatalogFormError error={error} title="Unable to update brand" />
        <FieldGroup>
          <form.Field
            name="name"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? undefined : "Enter a brand name.",
              onSubmit: ({ value }) =>
                value.trim() ? undefined : "Enter a brand name.",
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
          <form.Field name="website">
            {(field) => (
              <AppFormField
                description="Optional public website for the brand."
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Website"
                showErrors={wasSubmitted}
              >
                <Input
                  id={field.name}
                  maxLength={500}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
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
