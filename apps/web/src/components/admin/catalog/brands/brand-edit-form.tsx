"use client";

import type { AdminBrandSummary } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>Edit brand</CardTitle>
        <CardDescription>Update the brand details below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setWasSubmitted(true);
            void form.handleSubmit();
          }}
        >
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to update brand</AlertTitle>
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          ) : null}
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
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
            <form.Field name="website">
              {(field) => (
                <AppFormField
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Website"
                  showErrors={wasSubmitted}
                >
                  <Input
                    id={field.name}
                    maxLength={500}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
                  <Input
                    id={field.name}
                    maxLength={2000}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
            </form.Field>
          </FieldGroup>
          <form.Subscribe
            selector={(s) => ({
              canSubmit: s.canSubmit,
              isSubmitting: s.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <div className="flex justify-end gap-3">
                <Button
                  onClick={onCancel}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!canSubmit || isSubmitting || isPending}
                  size="sm"
                  type="submit"
                >
                  {isSubmitting || isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}
