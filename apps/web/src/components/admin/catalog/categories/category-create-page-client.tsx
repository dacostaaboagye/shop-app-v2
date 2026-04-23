"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminCategoriesQueryKey,
  createAdminCategory,
  fetchAdminCategories,
} from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";

const ACTIVE_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

export function CategoryCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const parentCategoriesQuery = useQuery({
    queryFn: () => fetchAdminCategories(ACTIVE_QUERY),
    queryKey: adminCategoriesQueryKey(ACTIVE_QUERY),
  });

  const createMutation = useMutation({
    mutationFn: createAdminCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "catalog", "categories"],
      });
      toast.success("Category created");
      router.push(toRoute("/admin/products/categories"));
    },
  });

  const form = useForm({
    defaultValues: {
      description: "",
      name: "",
      parentCategorySlug: "",
      status: "active" as "active" | "archived",
    },
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await createMutation.mutateAsync({
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

  const parentOptions = parentCategoriesQuery.data?.items ?? [];

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/products/categories")}
        backLabel="Categories"
        description="Add a category to organise products in the catalogue."
        title="New category"
      />
      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <CardTitle>Category details</CardTitle>
          <CardDescription>
            Categories can be nested using a parent category.
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
                <AlertTitle>Unable to create category</AlertTitle>
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
                      placeholder="Clothing"
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
                        {parentOptions.map((cat) => (
                          <SelectItem key={cat.slug} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    {isSubmitting ? "Creating…" : "Create category"}
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
