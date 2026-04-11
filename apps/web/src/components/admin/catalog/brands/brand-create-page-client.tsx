"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { PageHeader, PageShell } from "@/components/system/page-shell";
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
import { Select } from "@/components/ui/select";
import { createAdminBrand } from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";

export function BrandCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const createMutation = useMutation({
    mutationFn: createAdminBrand,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "catalog", "brands"],
      });
      toast.success("Brand created");
      router.push(toRoute("/admin/products/brands"));
    },
  });

  const form = useForm({
    defaultValues: {
      description: "",
      name: "",
      status: "active" as "active" | "archived",
      website: "",
    },
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await createMutation.mutateAsync({
        description: value.description.trim() || null,
        name: value.name.trim(),
        status: value.status,
        website: value.website.trim() || null,
      });
    },
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/products/brands")}
        backLabel="Brands"
        description="Add a brand entity to use in product assignments and filtering."
        title="New brand"
      />

      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <CardTitle>Brand details</CardTitle>
          <CardDescription>
            Brands help group products by manufacturer or label.
          </CardDescription>
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
            {createMutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to create brand</AlertTitle>
                <AlertDescription>
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
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
                      (field.state.meta.isDirty &&
                        field.state.meta.isBlurred) ||
                      wasSubmitted
                    }
                  >
                    <Input
                      id={field.name}
                      maxLength={160}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Acme Corp"
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
                      placeholder="https://example.com"
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
                      placeholder="Optional description"
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
                      id={field.name}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value as "active" | "archived",
                        )
                      }
                      value={field.state.value}
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
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
                    onClick={() => router.back()}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!canSubmit || isSubmitting}
                    size="sm"
                    type="submit"
                  >
                    {isSubmitting ? "Creating…" : "Create brand"}
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
