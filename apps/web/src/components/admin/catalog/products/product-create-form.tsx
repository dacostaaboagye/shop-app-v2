"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import {
  adminBrandsQueryKey,
  adminCategoriesQueryKey,
  fetchAdminBrands,
  fetchAdminCategories,
} from "@/lib/react-query/admin-catalog";
import { createAdminProduct } from "@/lib/react-query/admin-catalog-products";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import {
  CatalogFormActions,
  CatalogFormCard,
  CatalogFormError,
} from "../catalog-form-surfaces";

const ALL_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

export function ProductCreateForm() {
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
        brandSlug: value.brandSlug === "none" ? null : value.brandSlug || null,
        categorySlug:
          value.categorySlug === "none" ? null : value.categorySlug || null,
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
    <CatalogFormCard
      description="Start with the core product identity. Options and variants can be configured after creation."
      title="Product details"
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
          title="Unable to create product"
        />
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
                  (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                  wasSubmitted
                }
              >
                <Input
                  id={field.name}
                  maxLength={200}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
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
                  onValueChange={field.handleChange}
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="No brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No brand</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.slug} value={brand.slug}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
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
                  onValueChange={field.handleChange}
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.slug} value={category.slug}>
                        {category.name}
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
              submitLabel="Create product"
              submittingLabel="Creating..."
            />
          )}
        </form.Subscribe>
      </form>
    </CatalogFormCard>
  );
}
