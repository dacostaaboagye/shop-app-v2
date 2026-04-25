"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { PageHeader, PageShell } from "@/components/system/page-shell";
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
import { createAdminBrand } from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import {
  CatalogFormActions,
  CatalogFormCard,
  CatalogFormError,
} from "../catalog-form-surfaces";

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

      <CatalogFormCard
        description="Brands help group products by manufacturer or label."
        title="Brand details"
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
          <CatalogFormError
            error={createMutation.error}
            title="Unable to create brand"
          />

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
                    placeholder="Acme Corp"
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
                  <Textarea
                    id={field.name}
                    maxLength={2000}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
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
                isBusy={isSubmitting}
                onCancel={() => router.back()}
                submitLabel="Create brand"
                submittingLabel="Creating..."
              />
            )}
          </form.Subscribe>
        </form>
      </CatalogFormCard>
    </PageShell>
  );
}
