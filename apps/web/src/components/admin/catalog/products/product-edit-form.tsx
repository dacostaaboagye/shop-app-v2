"use client";

import type { AdminBrandSummary, AdminCategorySummary } from "@shop/contracts";
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
import { Textarea } from "@/components/ui/textarea";
import { ProductBasicDetailsFields } from "./product-basic-details-fields";
import { FeaturesField } from "./product-features-field";

export type ProductEditValues = {
  brandSlug: string;
  categorySlug: string;
  countryOfOrigin: string;
  description: string;
  features: string[];
  name: string;
  status: "active" | "archived";
};

type ProductEditFormProps = {
  brands: AdminBrandSummary[];
  categories: AdminCategorySummary[];
  defaultValues: ProductEditValues;
  error: unknown;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (values: ProductEditValues) => void;
};

export function ProductEditForm({
  brands,
  categories,
  defaultValues,
  error,
  isPending,
  onCancel,
  onSubmit,
}: ProductEditFormProps) {
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      onSubmit({
        ...value,
        brandSlug: value.brandSlug === "none" ? "" : value.brandSlug,
        categorySlug: value.categorySlug === "none" ? "" : value.categorySlug,
      });
    },
  });

  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>Edit product</CardTitle>
        <CardDescription>Update the product details below.</CardDescription>
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
              <AlertTitle>Unable to update product</AlertTitle>
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <ProductBasicDetailsFields
              brands={brands}
              categories={categories}
              form={form}
              wasSubmitted={wasSubmitted}
            />
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
                    maxLength={5000}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Product description…"
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
            <form.Field name="features">
              {(field) => (
                <FeaturesField field={field} showErrors={wasSubmitted} />
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
