"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  adminBrandsQueryKey,
  adminCategoriesQueryKey,
  fetchAdminBrands,
  fetchAdminCategories,
} from "@/lib/react-query/admin-catalog";
import { createAdminProduct } from "@/lib/react-query/admin-catalog-products";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";

const ALL_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

export function ProductCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const brandsQuery = useQuery({
    queryFn: () => fetchAdminBrands(ALL_QUERY),
    queryKey: adminBrandsQueryKey(ALL_QUERY),
  });
  const categoriesQuery = useQuery({
    queryFn: () => fetchAdminCategories(ALL_QUERY),
    queryKey: adminCategoriesQueryKey(ALL_QUERY),
  });
  const createMutation = useMutation({
    mutationFn: createAdminProduct,
    onSuccess: (product) => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "catalog", "products"],
      });
      toast.success("Product created");
      router.push(
        toRoute(`/admin/products/${encodeURIComponent(product.slug)}`),
      );
    },
  });
  const form = useForm({
    defaultValues: {
      brandSlug: "",
      categorySlug: "",
      name: "",
      status: "active" as "active" | "archived",
    },
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await createMutation.mutateAsync({
        brandSlug: value.brandSlug || null,
        categorySlug: value.categorySlug || null,
        isTaxable: true,
        name: value.name.trim(),
        priceIncludesTax: false,
        status: value.status,
      });
    },
  });
  const brands = brandsQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.items ?? [];
  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/products")}
        backLabel="Products"
        description="Register a new product. Configure options and variants after creation."
        title="New product"
      />
      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
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
                <AlertTitle>Unable to create product</AlertTitle>
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
                    value.trim() ? undefined : "Enter a product name.",
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : "Enter a product name.",
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
                      maxLength={200}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Omaya 1819 Backpack"
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="brandSlug">
                {(field) => (
                  <AppFormField
                    errors={field.state.meta.errors}
                    inputId={field.name}
                    label="Brand"
                    showErrors={wasSubmitted}
                  >
                    <Select
                      id={field.name}
                      onChange={(e) => field.handleChange(e.target.value)}
                      value={field.state.value}
                    >
                      <option value="">No brand</option>
                      {brands.map((b) => (
                        <option key={b.slug} value={b.slug}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="categorySlug">
                {(field) => (
                  <AppFormField
                    errors={field.state.meta.errors}
                    inputId={field.name}
                    label="Category"
                    showErrors={wasSubmitted}
                  >
                    <Select
                      id={field.name}
                      onChange={(e) => field.handleChange(e.target.value)}
                      value={field.state.value}
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
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
                    {isSubmitting ? "Creating…" : "Create product"}
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
